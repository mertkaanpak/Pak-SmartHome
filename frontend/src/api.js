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
  if (!res.ok) throw new Error(data.error ?? `Fehler (HTTP ${res.status})`)
  return data
}

const jsonPost = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const fetchDevices = (fresh = false) => api(`/api/devices${fresh ? '?fresh=1' : ''}`)

export const fetchIntegrations = () => api('/api/integrations')

export const sendCommand = (deviceId, command, params) =>
  api(
    `/api/devices/${encodeURIComponent(deviceId)}/commands`,
    jsonPost(params ? { command, params } : { command }),
  )
