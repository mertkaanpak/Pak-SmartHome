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
  if (res.status === 401 && data.code === 'AUTH_REQUIRED') {
    // Nur echte Session-Abläufe führen zurück zum Login — Fehler aus
    // Integrationen (z. B. Ring-Anmeldung) bleiben im jeweiligen Formular.
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

export const fetchEvents = (limit = 50, before) =>
  api(`/api/events?limit=${limit}${before ? `&before=${before}` : ''}`)

export const fetchScenes = () => api('/api/scenes')

export const createScene = (scene) => api('/api/scenes', json('POST', scene))

export const updateScene = (id, patch) => api(`/api/scenes/${id}`, json('PATCH', patch))

export const deleteScene = (id) => api(`/api/scenes/${id}`, { method: 'DELETE' })

export const executeScene = (id) => api(`/api/scenes/${id}/execute`, { method: 'POST' })

export const ringAuth = (email, password, code) =>
  api('/api/integrations/ring/auth', json('POST', code ? { email, password, code } : { email, password }))

export const ringDisconnect = () => api('/api/integrations/ring/auth', { method: 'DELETE' })

export const saveTuyaSettings = (settings) =>
  api('/api/integrations/tuya/settings', json('POST', settings))

export const fetchCameras = () => api('/api/integrations/cameras/cameras')

export const addCamera = (camera) => api('/api/integrations/cameras/cameras', json('POST', camera))

export const deleteCamera = (id) =>
  api(`/api/integrations/cameras/cameras/${id}`, { method: 'DELETE' })

export const testCamera = (id) =>
  api(`/api/integrations/cameras/cameras/${id}/test`, { method: 'POST' })

// WebRTC-Signaling lokale Kameras: SDP-Offer hin, SDP-Answer zurück
export async function cameraWebrtcOffer(cameraId, offerSdp) {
  const res = await fetch(`/api/cameras/${cameraId}/webrtc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: offerSdp,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? 'Stream nicht verfügbar')
  }
  return res.text()
}

// WebRTC-Signaling Ring: liefert Answer + Sitzungs-ID (zum Beenden)
export async function ringLiveStart(cameraId, offerSdp) {
  const res = await fetch(`/api/integrations/ring/cameras/${cameraId}/live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: offerSdp,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Live-Stream nicht verfügbar')
  return data // { sdp, sessionId }
}

export function ringLiveStop(sessionId) {
  // keepalive: wird auch beim Schließen der Seite noch zugestellt
  fetch(`/api/integrations/ring/live/${sessionId}`, { method: 'DELETE', keepalive: true }).catch(
    () => {},
  )
}

export const fetchAutomations = () => api('/api/automations')

export const createAutomation = (automation) => api('/api/automations', json('POST', automation))

export const updateAutomation = (id, patch) => api(`/api/automations/${id}`, json('PATCH', patch))

export const deleteAutomation = (id) => api(`/api/automations/${id}`, { method: 'DELETE' })

export const runAutomation = (id) => api(`/api/automations/${id}/run`, { method: 'POST' })

export const fetchAuthStatus = () => api('/api/auth/status')

export const authLogin = (username, password) =>
  api('/api/auth/login', json('POST', { username, password }))

export const authSetup = (username, password) =>
  api('/api/auth/setup', json('POST', { username, password }))

export const authLogout = () => api('/api/auth/logout', { method: 'POST' })
