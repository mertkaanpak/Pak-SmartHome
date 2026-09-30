import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchDevices, fetchIntegrations, sendCommand } from './api.js'
import { DeviceCard } from './components/DeviceCard.jsx'
import { INTEGRATION_ICONS, IconDevice, IconRefresh } from './components/icons.jsx'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Guten Morgen'
  if (hour < 18) return 'Guten Tag'
  return 'Guten Abend'
}

// Geräte nach Raum gruppieren; Geräte ohne Raum zuletzt.
function groupByRoom(devices) {
  const groups = new Map()
  for (const device of devices) {
    const key = device.room ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(device)
  }
  return [...groups.entries()]
    .map(([room, list]) => ({ room: room || null, devices: list }))
    .sort((a, b) => (a.room ?? '￿').localeCompare(b.room ?? '￿', 'de'))
}

export default function App() {
  const [devices, setDevices] = useState([])
  const [deviceErrors, setDeviceErrors] = useState([])
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [fatal, setFatal] = useState(null)
  const [bulkResult, setBulkResult] = useState(null)
  const reloadTimer = useRef(null)

  const load = useCallback(async (fresh = false) => {
    try {
      const [deviceData, integrationData] = await Promise.all([
        fetchDevices(fresh),
        fetchIntegrations(),
      ])
      setDevices(deviceData.devices)
      setDeviceErrors(deviceData.errors)
      setIntegrations(integrationData.integrations)
      setFatal(null)
    } catch (err) {
      setFatal(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    return () => clearTimeout(reloadTimer.current)
  }, [load])

  // Nach einem Befehl den echten Zustand nachladen (Gerät meldet die neue
  // Position erst nach kurzer Zeit an die Hersteller-Cloud).
  const scheduleReload = useCallback(() => {
    clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(() => load(true), 1500)
  }, [load])

  const covers = devices.filter((d) => d.type === 'cover')
  const favorites = devices.filter((d) => d.favorite)
  const unconfigured = integrations.filter((i) => !i.configured)

  const runBulk = async (command) => {
    setBulkResult({ pending: true })
    const targets = covers.filter((d) => d.capabilities.includes(command))
    const results = await Promise.allSettled(targets.map((d) => sendCommand(d.id, command)))
    const ok = results.filter((r) => r.status === 'fulfilled').length
    setBulkResult({ ok, total: targets.length })
    scheduleReload()
  }

  return (
    <div className="app">
      <header>
        <div>
          <h1>{greeting()}</h1>
          <p className="subtitle">SmartHome Kontrollzentrum</p>
        </div>
        <button className="icon-button" onClick={() => load(true)} aria-label="Aktualisieren">
          <IconRefresh />
        </button>
      </header>

      {fatal && <div className="banner banner-error">{fatal}</div>}
      {loading && <div className="banner">Lade Geräte…</div>}
      {deviceErrors.map((e) => (
        <div key={e.integration} className="banner banner-error">
          <strong>{e.label}:</strong> {e.error}
        </div>
      ))}

      {favorites.length > 0 && (
        <section>
          <h2 className="section-title">Favoriten</h2>
          <div className="device-list">
            {favorites.map((d) => (
              <DeviceCard key={d.id} device={d} onCommandDone={scheduleReload} />
            ))}
          </div>
        </section>
      )}

      {covers.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="section-title">Rollläden</h2>
            <div className="bulk-actions">
              <button onClick={() => runBulk('open')}>Alle öffnen</button>
              <button onClick={() => runBulk('close')}>Alle schließen</button>
            </div>
          </div>
          {bulkResult && !bulkResult.pending && (
            <p className={`bulk-result ${bulkResult.ok < bulkResult.total ? 'control-error' : ''}`}>
              {bulkResult.ok} von {bulkResult.total} Rollläden angesteuert
            </p>
          )}
          {groupByRoom(covers).map((group) => (
            <div key={group.room ?? 'ohne-raum'}>
              {group.room && <h3 className="room-title">{group.room}</h3>}
              <div className="device-list">
                {group.devices.map((d) => (
                  <DeviceCard key={d.id} device={d} onCommandDone={scheduleReload} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {!loading && covers.length === 0 && deviceErrors.length === 0 && !fatal && (
        <div className="banner">Keine Geräte gefunden.</div>
      )}

      {unconfigured.length > 0 && (
        <section>
          <h2 className="section-title">Einrichtung ausstehend</h2>
          <div className="device-list">
            {unconfigured.map((integration) => {
              const IconForIntegration = INTEGRATION_ICONS[integration.name] ?? IconDevice
              return (
                <article key={integration.name} className="device device-pending">
                  <div className="device-row">
                    <span className="device-icon">
                      <IconForIntegration />
                    </span>
                    <span className="device-name">{integration.label}</span>
                    <span className="status-pill pill-pending">Konfiguration erforderlich</span>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
