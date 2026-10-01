import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { fetchDevices, sendCommand, updateDeviceMeta } from '../api.js'
import { useToast } from '../components/Toast.jsx'

const DevicesContext = createContext(null)

const REFRESH_INTERVAL_MS = 90_000

// Zentraler Geräte-Store: eine Datenquelle für alle Ansichten.
// Aktualisiert zurückhaltend (sichtbarer Tab, moderates Intervall),
// um die Tuya-Cloud nicht mit Anfragen zu fluten.
export function DevicesProvider({ children }) {
  const [devices, setDevices] = useState(null) // null = initial lädt
  const [integrationErrors, setIntegrationErrors] = useState([])
  const [fatal, setFatal] = useState(null)
  const [pendingById, setPendingById] = useState({})
  const reloadTimer = useRef(null)
  const toast = useToast()

  const load = useCallback(async (fresh = false) => {
    try {
      const data = await fetchDevices(fresh)
      setDevices(data.devices)
      setIntegrationErrors(data.errors)
      setFatal(null)
    } catch (err) {
      setFatal(err.message)
      setDevices((prev) => prev ?? [])
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load(true)
    }, REFRESH_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true)
    }
    document.addEventListener('visibilitychange', onVisible)

    // Live-Updates vom Backend (SSE): Ereignisse werden app-weit als
    // 'pak:event' weitergereicht; Geräte-/Szenen-Ereignisse stoßen einen
    // (gebündelten) Refresh an — so bleiben mehrere Geräte synchron.
    const stream = new EventSource('/api/events/stream')
    let refreshTimer = null
    stream.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data)
        window.dispatchEvent(new CustomEvent('pak:event', { detail: event }))
        if (event.type.startsWith('device.') || event.type.startsWith('scene.')) {
          clearTimeout(refreshTimer)
          refreshTimer = setTimeout(() => load(true), 1800)
        }
      } catch {
        // kaputte Zeile ignorieren
      }
    }

    return () => {
      clearInterval(interval)
      clearTimeout(reloadTimer.current)
      clearTimeout(refreshTimer)
      document.removeEventListener('visibilitychange', onVisible)
      stream.close()
    }
  }, [load])

  // Nach einem Befehl den tatsächlichen Zustand nachladen — das Gerät
  // meldet die neue Position erst mit kurzer Verzögerung an die Cloud.
  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(() => load(true), 1600)
  }, [load])

  const setPending = (id, value) =>
    setPendingById((map) => {
      const next = { ...map }
      if (value) next[id] = value
      else delete next[id]
      return next
    })

  const command = useCallback(
    async (device, cmd, params) => {
      setPending(device.id, cmd)
      try {
        await sendCommand(device.id, cmd, params)
        scheduleReload()
        return true
      } catch (err) {
        toast(`„${device.name}": ${err.message}`, 'error')
        return false
      } finally {
        setPending(device.id, null)
      }
    },
    [scheduleReload, toast],
  )

  const updateMeta = useCallback(
    async (device, patch) => {
      try {
        const updated = await updateDeviceMeta(device.id, patch)
        setDevices((list) => list.map((d) => (d.id === updated.id ? updated : d)))
        return updated
      } catch (err) {
        toast(`Änderung fehlgeschlagen: ${err.message}`, 'error')
        return null
      }
    },
    [toast],
  )

  const value = {
    devices,
    loading: devices === null,
    integrationErrors,
    fatal,
    pendingById,
    load,
    command,
    updateMeta,
  }

  return <DevicesContext.Provider value={value}>{children}</DevicesContext.Provider>
}

export function useDevices() {
  return useContext(DevicesContext)
}
