// Eigener Service Worker: Offline-Shell (Workbox-Precache) plus
// Web-Push-Behandlung. vite-plugin-pwa (injectManifest) ersetzt
// self.__WB_MANIFEST beim Build durch die Liste der zu cachenden Dateien.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST || [])

// Eingehende Push-Nachricht anzeigen
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'Pak SmartHome', body: event.data?.text() ?? '' }
  }
  const title = payload.title || 'Pak SmartHome'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: payload.tag,
      data: { url: payload.url || '/' },
    }),
  )
})

// Tippen auf die Benachrichtigung: App öffnen bzw. in den Vordergrund holen
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
