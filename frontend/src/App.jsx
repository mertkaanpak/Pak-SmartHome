import { useCallback, useEffect, useState } from 'react'

const MODULE_ICONS = {
  tuya: '🪟',
  ring: '🔔',
  cameras: '📹',
}

function statusText(mod) {
  if (mod.ready) return 'Bereit'
  if (mod.configured) return 'Konfiguriert, Integration folgt'
  return 'Noch nicht eingerichtet'
}

async function api(path, options) {
  const res = await fetch(path, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
}

function Cover({ device, onAction }) {
  const [percent, setPercent] = useState(device.status.percent_control ?? 0)
  const [busy, setBusy] = useState(false)

  const send = useCallback(
    async (fn) => {
      setBusy(true)
      try {
        await fn()
      } catch (err) {
        alert(`Fehler bei „${device.name}": ${err.message}`)
      } finally {
        setBusy(false)
      }
    },
    [device.name],
  )

  const move = (action) =>
    send(() => api(`/api/tuya/covers/${device.id}/${action}`, { method: 'POST' }))

  const moveTo = (value) =>
    send(() =>
      api(`/api/tuya/covers/${device.id}/position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent: value }),
      }),
    )

  return (
    <div className={`cover ${device.online ? '' : 'offline'}`}>
      <div className="cover-row">
        <span className="cover-name">
          {device.name}
          {!device.online && <span className="offline-tag"> · offline</span>}
        </span>
        <div className="cover-buttons">
          <button disabled={busy} onClick={() => move('open')} aria-label="Hochfahren">
            ▲
          </button>
          <button disabled={busy} onClick={() => move('stop')} aria-label="Stopp">
            ■
          </button>
          <button disabled={busy} onClick={() => move('close')} aria-label="Runterfahren">
            ▼
          </button>
        </div>
      </div>
      <div className="cover-row">
        <input
          type="range"
          min="0"
          max="100"
          value={percent}
          disabled={busy}
          onChange={(e) => setPercent(Number(e.target.value))}
          onMouseUp={() => moveTo(percent)}
          onTouchEnd={() => moveTo(percent)}
        />
        <span className="cover-percent">{percent} %</span>
      </div>
    </div>
  )
}

function TuyaCard({ mod }) {
  const [devices, setDevices] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!mod.ready) return
    api('/api/tuya/devices')
      .then((data) => setDevices(data.devices.filter((d) => d.isCover)))
      .catch((err) => setError(err.message))
  }, [mod.ready])

  return (
    <section className="card">
      <div className="card-header">
        <span className="card-icon">{MODULE_ICONS.tuya}</span>
        <h2>{mod.label}</h2>
        <span className={`status-dot ${mod.ready ? 'ready' : 'pending'}`} />
      </div>
      {!mod.ready && <p className="card-status">{statusText(mod)}</p>}
      {error && <p className="card-status error-text">{error}</p>}
      {mod.ready && !devices && !error && <p className="card-status">Lade Rollläden…</p>}
      {devices && (
        <div className="cover-list">
          {devices.map((d) => (
            <Cover key={d.id} device={d} />
          ))}
        </div>
      )}
    </section>
  )
}

function StubCard({ mod }) {
  return (
    <section className="card">
      <div className="card-header">
        <span className="card-icon">{MODULE_ICONS[mod.name] ?? '⚙️'}</span>
        <h2>{mod.label}</h2>
        <span className={`status-dot ${mod.ready ? 'ready' : 'pending'}`} />
      </div>
      <p className="card-status">{statusText(mod)}</p>
    </section>
  )
}

export default function App() {
  const [modules, setModules] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api('/api/status')
      .then((data) => setModules(data.modules))
      .catch(() => setError('Backend nicht erreichbar'))
  }, [])

  return (
    <div className="app">
      <header>
        <h1>SmartHome</h1>
        <p className="subtitle">Kontrollzentrum</p>
      </header>

      {error && <div className="banner error">{error}</div>}
      {!error && !modules && <div className="banner">Lade Status…</div>}

      <main>
        {modules?.map((mod) =>
          mod.name === 'tuya' ? (
            <TuyaCard key={mod.name} mod={mod} />
          ) : (
            <StubCard key={mod.name} mod={mod} />
          ),
        )}
      </main>
    </div>
  )
}
