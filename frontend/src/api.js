// Zentraler API-Client: einheitliche Fehlerbehandlung mit verständlichen
// Meldungen; die Komponenten arbeiten nur mit diesen Funktionen.
export async function api(path, options = {}) {
  let res
  try {
    res = await fetch(path, options)
  } catch {
    throw new Error('Backend nicht erreichbar')
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401 && !path.startsWith('/api/auth/')) {
    // Session abgelaufen: App zurück auf den Login-Bildschirm schicken
    window.dispatchEvent(new Event('pak:unauthorized'))
  }
  if (!res.ok) throw new Error(data.error ?? `Fehler (HTTP ${res.status})`)
  return data
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const fetchDevices = (fresh = false) => api(`/api/devices${fresh ? '?fresh=1' : ''}`)

export const fetchIntegrations = () => api('/api/integrations')

export const fetchHealth = () => api('/api/system/health')

export const sendCommand = (deviceId, command, params) =>
  api(
    `/api/devices/${encodeURIComponent(deviceId)}/commands`,
    json('POST', params ? { command, params } : { command }),
  )

export const updateDeviceMeta = (deviceId, patch) =>
  api(`/api/devices/${encodeURIComponent(deviceId)}`, json('PATCH', patch))

export const fetchAuthStatus = () => api('/api/auth/status')

export const authLogin = (username, password) =>
  api('/api/auth/login', json('POST', { username, password }))

export const authSetup = (username, password) =>
  api('/api/auth/setup', json('POST', { username, password }))

export const authLogout = () => api('/api/auth/logout', { method: 'POST' })
