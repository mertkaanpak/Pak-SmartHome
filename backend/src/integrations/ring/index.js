import { randomUUID } from 'node:crypto'
import express, { Router } from 'express'
import { z } from 'zod'
// Gepflegter Fork des ring-mqtt-Maintainers: enthält die Fixes für Rings
// Auth-Umstellung vom Februar 2026 (Cloudflare WAF verlangt App-identische
// Anfragen; das Original ring-client-api 14.3.0 ist dafür zu alt).
import { RingApi } from '@tsightler/ring-client-api'
import { RingRestClient } from '@tsightler/ring-client-api/rest-client'
import { config } from '../../config.js'
import { createLogger } from '../../logger.js'
import { HttpError, IntegrationError } from '../../errors.js'
import { withTimeout } from '../../core/async.js'
import { Capability, DeviceStatus, DeviceType } from '../../core/capabilities.js'
import { validateBody } from '../../middleware/validate.js'

const REQUEST_TIMEOUT_MS = 15_000
const PENDING_AUTH_TTL_MS = 10 * 60 * 1000

const authSchema = z.object({
  email: z.string().trim().email('E-Mail-Adresse prüfen'),
  password: z.string().min(1, 'Passwort fehlt').max(200),
  code: z.string().trim().max(10).optional(),
})

// Adapter für Ring (Türklingel/Kameras) über ring-client-api.
// Die Anmeldung läuft komplett in der App: E-Mail/Passwort (+ 2FA-Code)
// gehen nur an die Ring-Server; gespeichert wird ausschließlich der
// Refresh-Token — verschlüsselt in der Datenbank. ring-client-api bleibt
// eine reine Adapter-Abhängigkeit.
export function createRingAdapter({ settings, events } = {}) {
  const log = createLogger('ring')

  let api = null
  let apiToken = ''
  // Laufende 2FA-Anmeldungen: der RestClient muss zwischen Passwort- und
  // Code-Schritt derselbe bleiben (gleiche Hardware-ID gegenüber Ring).
  const pendingAuth = new Map() // email -> { client, at }

  const currentToken = () => settings?.get('ring')?.refreshToken ?? config.ring.refreshToken ?? ''

  function getApi() {
    const token = currentToken()
    if (!token) return null
    if (api && token === apiToken) return api

    api = new RingApi({ refreshToken: token, controlCenterDisplayName: 'Pak SmartHome' })
    apiToken = token
    // Ring rotiert Refresh-Tokens — neue Fassung sofort persistieren,
    // sonst ist der gespeicherte Token beim nächsten Start ungültig.
    api.onRefreshTokenUpdated.subscribe(({ newRefreshToken }) => {
      apiToken = newRefreshToken
      settings?.set('ring', { refreshToken: newRefreshToken })
      log.info('Ring-Refresh-Token aktualisiert')
    })
    subscribeToEvents(api)
    return api
  }

  async function subscribeToEvents(apiInstance) {
    try {
      const cameras = await apiInstance.getCameras()
      for (const camera of cameras) {
        camera.onDoorbellPressed?.subscribe(() => {
          events?.emit('doorbell.ring', {
            deviceId: `ring:${camera.id}`,
            message: `Es hat an „${camera.name}" geklingelt`,
          })
        })
        camera.onMotionDetected?.subscribe((motion) => {
          if (!motion) return
          events?.emit('camera.motion', {
            deviceId: `ring:${camera.id}`,
            message: `Bewegung an „${camera.name}" erkannt`,
          })
        })
      }
      log.info('Ring-Ereignisse abonniert', { cameras: cameras.length })
    } catch (err) {
      log.warn('Ring-Ereignisse nicht abonnierbar', { error: String(err) })
    }
  }

  function mapCamera(camera) {
    const isDoorbell = Boolean(camera.isDoorbot)
    const battery = Number(camera.batteryLevel)
    const connection = camera.data?.alerts?.connection
    return {
      id: `ring:${camera.id}`,
      externalId: String(camera.id),
      name: camera.name,
      room: null,
      type: isDoorbell ? DeviceType.DOORBELL : DeviceType.CAMERA,
      manufacturer: 'Ring',
      integration: 'ring',
      status:
        connection === 'online'
          ? DeviceStatus.ONLINE
          : connection === 'offline'
            ? DeviceStatus.OFFLINE
            : DeviceStatus.UNKNOWN,
      lastSeen: null,
      capabilities: [
        Capability.MOTION,
        Capability.SNAPSHOT,
        ...(isDoorbell ? [Capability.DOORBELL] : []),
        ...(Number.isFinite(battery) ? [Capability.BATTERY] : []),
      ],
      state: Number.isFinite(battery) ? { battery } : {},
    }
  }

  async function getSnapshot(externalId) {
    const camera = await findCamera(externalId)
    // Batteriekameras brauchen fürs Aufwachen gern ein paar Sekunden
    return withTimeout(
      camera.getSnapshot(),
      25_000,
      'Die Kamera liefert gerade kein Standbild (evtl. im Energiesparmodus)',
    )
  }

  async function findCamera(externalId) {
    const ring = getApi()
    if (!ring) throw new IntegrationError('Ring nicht verbunden')
    const cameras = await withTimeout(
      ring.getCameras(),
      REQUEST_TIMEOUT_MS,
      'Ring antwortet nicht (Zeitüberschreitung)',
    )
    const camera = cameras.find((c) => String(c.id) === externalId)
    if (!camera) throw new HttpError(404, 'Ring-Kamera nicht gefunden')
    return camera
  }

  // Aktive Live-Sitzungen: nach 10 Minuten serverseitig beenden, damit
  // vergessene Tabs keine Dauerstreams bei Ring offen halten.
  const LIVE_SESSION_MAX_MS = 10 * 60 * 1000
  const liveSessions = new Map() // sessionId -> { session, timer }

  function endLiveSession(sessionId) {
    const entry = liveSessions.get(sessionId)
    if (!entry) return
    clearTimeout(entry.timer)
    liveSessions.delete(sessionId)
    entry.session.end().catch(() => {})
  }

  const router = Router()

  // Live-Video per WebRTC: Browser-Offer rein, Ring-Answer zurück.
  // Die Mediendaten laufen danach direkt Browser <-> Ring-Server.
  router.post(
    '/cameras/:id/live',
    express.text({ type: ['application/sdp', 'text/plain'], limit: '64kb' }),
    async (req, res) => {
      const camera = await findCamera(req.params.id)
      const session = camera.createSimpleWebRtcSession()
      const answer = await withTimeout(
        session.start(req.body),
        REQUEST_TIMEOUT_MS,
        'Ring startet den Live-Stream gerade nicht (Zeitüberschreitung)',
      ).catch((err) => {
        session.end().catch(() => {})
        throw err instanceof HttpError || err instanceof IntegrationError
          ? err
          : new IntegrationError('Ring-Live-Stream konnte nicht gestartet werden')
      })
      const sessionId = randomUUID().slice(0, 12)
      const timer = setTimeout(() => endLiveSession(sessionId), LIVE_SESSION_MAX_MS)
      timer.unref?.()
      liveSessions.set(sessionId, { session, timer })
      res.json({ sdp: answer, sessionId })
    },
  )

  router.delete('/live/:sessionId', (req, res) => {
    endLiveSession(req.params.sessionId)
    res.json({ ok: true })
  })

  // Aktuelles Standbild einer Ring-Kamera (JPEG)
  router.get('/cameras/:id/snapshot', async (req, res) => {
    const image = await getSnapshot(req.params.id)
    res.set('Cache-Control', 'no-store').type('image/jpeg').send(image)
  })

  // Anmeldung aus der App: Schritt 1 E-Mail/Passwort, Schritt 2 ggf. 2FA-Code
  router.post('/auth', validateBody(authSchema), async (req, res) => {
    const { email, password, code } = req.body
    const key = email.toLowerCase()

    for (const [k, entry] of pendingAuth) {
      if (Date.now() - entry.at > PENDING_AUTH_TTL_MS) pendingAuth.delete(k)
    }

    let client = code ? pendingAuth.get(key)?.client : null
    if (!client) {
      client = new RingRestClient({ email, password })
      pendingAuth.set(key, { client, at: Date.now() })
    }

    try {
      const auth = await withTimeout(
        client.getAuth(code),
        REQUEST_TIMEOUT_MS,
        'Ring antwortet nicht (Zeitüberschreitung)',
      )
      pendingAuth.delete(key)
      settings.set('ring', { refreshToken: auth.refresh_token })
      api = null // beim nächsten Zugriff mit neuem Token verbinden
      res.json({ ok: true })
    } catch (err) {
      if (client.using2fa && !code) {
        return res.json({
          needs2fa: true,
          prompt: client.promptFor2fa ?? 'Bitte den Bestätigungscode von Ring eingeben',
        })
      }
      // Die echte Ring-Begründung loggen (ohne Zugangsdaten) — sonst ist
      // "Passwort falsch" nur geraten.
      const detail = String(err?.message ?? err).slice(0, 300)
      log.warn('Ring-Anmeldung fehlgeschlagen', { detail, hadCode: Boolean(code) })

      let message = code
        ? 'Der Bestätigungscode wurde nicht akzeptiert'
        : 'Ring hat die Anmeldung abgelehnt — E-Mail und Passwort prüfen'
      if (/too many|429/i.test(detail)) {
        message = 'Ring blockiert vorübergehend weitere Versuche — bitte in einigen Minuten erneut probieren'
      } else if (/captcha|suspicious|blocked/i.test(detail)) {
        message =
          'Ring verlangt eine zusätzliche Bestätigung — bitte einmal auf ring.com anmelden und es danach hier erneut versuchen'
      }
      // Bewusst 400 statt 401: ein 401 würde das Frontend als abgelaufene
      // App-Sitzung deuten und zum Login springen.
      throw new HttpError(400, message)
    }
  })

  // Verbindung trennen: Token löschen
  router.delete('/auth', (req, res) => {
    settings.remove('ring')
    api = null
    apiToken = ''
    res.json({ ok: true })
  })

  return {
    name: 'ring',
    label: 'Türklingel',
    manufacturer: 'Ring',
    get configured() {
      return Boolean(currentToken())
    },
    router,

    // Beim Serverstart Ereignis-Abos aufbauen, falls verbunden
    initialize() {
      if (currentToken()) getApi()
    },

    async getDevices() {
      const ring = getApi()
      if (!ring) throw new IntegrationError('Ring nicht verbunden')
      const cameras = await withTimeout(
        ring.getCameras(),
        REQUEST_TIMEOUT_MS,
        'Ring antwortet nicht (Zeitüberschreitung)',
      )
      return cameras.map(mapCamera)
    },

    async executeCommand() {
      throw new IntegrationError('Ring-Geräte unterstützen hier noch keine Befehle')
    },

    async healthCheck() {
      if (!currentToken()) return { status: 'not_configured' }
      try {
        const ring = getApi()
        await withTimeout(
          ring.getLocations(),
          REQUEST_TIMEOUT_MS,
          'Ring antwortet nicht (Zeitüberschreitung)',
        )
        return { status: 'connected' }
      } catch (err) {
        return { status: 'error', message: 'Ring-Verbindung gestört — ggf. neu anmelden' }
      }
    },
  }
}
