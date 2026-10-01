import { fetchVapidKey, removePushSubscription, savePushSubscription } from '../api.js'

// VAPID-Schlüssel (base64url) in das von der Push-API erwartete Format bringen
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

// iOS liefert Web-Push nur, wenn die App zum Home-Bildschirm hinzugefügt und
// von dort gestartet wurde.
export function isIosSafariNonStandalone() {
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
  return iOS && !standalone
}

export async function getPushState() {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? 'on' : 'off'
  } catch {
    return 'off'
  }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('Dieses Gerät unterstützt keine Benachrichtigungen')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Benachrichtigungen wurden nicht erlaubt')
  }
  const reg = await navigator.serviceWorker.ready
  const { key } = await fetchVapidKey()
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  })
  await savePushSubscription(sub.toJSON())
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await removePushSubscription(sub.endpoint).catch(() => {})
    await sub.unsubscribe()
  }
}
