import webpush from 'web-push'
import { createLogger } from '../logger.js'

// Welche Ereignisse eine Push-Benachrichtigung auslösen und wie sie heißt.
const PUSH_RULES = {
  'doorbell.ring': (e) => ({ title: '🔔 Türklingel', body: e.message }),
  'camera.motion': (e) => ({ title: 'Bewegung erkannt', body: e.message }),
  'device.offline': (e) => ({ title: 'Gerät nicht erreichbar', body: e.message }),
}

// Web-Push für die PWA: VAPID-Schlüssel werden einmal erzeugt und
// (verschlüsselt) gespeichert; Abos liegen in SQLite. Beim Versand werden
// abgelaufene Abos (404/410) automatisch entfernt.
export function createPushService({ db, settings, events }) {
  const log = createLogger('push')

  let vapid = settings.get('push_vapid')
  if (!vapid?.publicKey) {
    vapid = { ...webpush.generateVAPIDKeys(), subject: 'mailto:admin@pak-smarthome.local' }
    settings.set('push_vapid', vapid)
    log.info('VAPID-Schlüssel erzeugt')
  }
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey)

  const selectAll = db.prepare('SELECT subscription FROM push_subscriptions')
  const upsert = db.prepare(`
    INSERT INTO push_subscriptions (endpoint, subscription, created_at) VALUES (?, ?, ?)
    ON CONFLICT (endpoint) DO UPDATE SET subscription = excluded.subscription
  `)
  const remove = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
  const count = db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions')

  async function notify(payload) {
    const data = JSON.stringify(payload)
    const subs = selectAll.all()
    await Promise.all(
      subs.map(async (row) => {
        const sub = JSON.parse(row.subscription)
        try {
          await webpush.sendNotification(sub, data)
        } catch (err) {
          // 404/410: Abo ist beim Push-Dienst abgelaufen -> entfernen
          if (err.statusCode === 404 || err.statusCode === 410) {
            remove.run(sub.endpoint)
          } else {
            log.warn('Push-Versand fehlgeschlagen', { status: err.statusCode })
          }
        }
      }),
    )
  }

  // An den Event-Bus hängen: passende Ereignisse werden zu Push-Nachrichten
  events.subscribe((event) => {
    const rule = PUSH_RULES[event.type]
    if (!rule) return
    const { title, body } = rule(event)
    notify({ title, body, url: '/', tag: event.type }).catch((err) =>
      log.error('Push-Benachrichtigung fehlgeschlagen', { error: String(err) }),
    )
  })

  return {
    publicKey: () => vapid.publicKey,
    subscribe(subscription) {
      if (!subscription?.endpoint) return
      upsert.run(subscription.endpoint, JSON.stringify(subscription), Date.now())
    },
    unsubscribe(endpoint) {
      if (endpoint) remove.run(endpoint)
    },
    count: () => count.get().n,
    notify, // für Testzwecke
  }
}
