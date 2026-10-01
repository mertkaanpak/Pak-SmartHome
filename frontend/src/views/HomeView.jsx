import { useMemo, useState } from 'react'
import { BottomSheet } from '../components/BottomSheet.jsx'
import { DeviceCard } from '../components/DeviceCard.jsx'
import { DeviceSheet } from '../components/DeviceSheet.jsx'
import { DeviceListSkeleton } from '../components/Skeleton.jsx'
import { IconDown, IconUp } from '../components/icons.jsx'
import { useToast } from '../components/Toast.jsx'
import { useDevices } from '../state/DevicesContext.jsx'
import { groupByRoom } from '../lib/rooms.js'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Guten Morgen, Mert'
  if (hour < 18) return 'Guten Tag, Mert'
  return 'Guten Abend, Mert'
}

function summarize(devices, integrationErrors) {
  const offline = devices.filter((d) => d.status !== 'ONLINE')
  if (integrationErrors.length > 0) {
    return { tone: 'danger', text: integrationErrors[0].error }
  }
  if (offline.length === 1) {
    return { tone: 'warn', text: `„${offline[0].name}" ist nicht erreichbar` }
  }
  if (offline.length > 1) {
    return { tone: 'warn', text: `${offline.length} Geräte sind nicht erreichbar` }
  }
  return { tone: 'ok', text: 'Alles in Ordnung' }
}

export function HomeView() {
  const { devices, loading, integrationErrors, fatal, command } = useDevices()
  const toast = useToast()
  const [selected, setSelected] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null) // 'open' | 'close'
  const [bulkRunning, setBulkRunning] = useState(false)

  const covers = useMemo(() => (devices ?? []).filter((d) => d.type === 'cover'), [devices])
  const favorites = useMemo(() => (devices ?? []).filter((d) => d.favorite), [devices])
  const online = (devices ?? []).filter((d) => d.status === 'ONLINE').length

  const runBulk = async (action) => {
    setConfirmAction(null)
    setBulkRunning(true)
    const targets = covers.filter((d) => d.capabilities.includes(action))
    const results = await Promise.all(targets.map((d) => command(d, action)))
    const ok = results.filter(Boolean).length
    setBulkRunning(false)
    toast(
      ok === targets.length
        ? `Alle ${ok} Rollläden werden ${action === 'open' ? 'geöffnet' : 'geschlossen'}`
        : `${ok} von ${targets.length} Rollläden angesteuert`,
      ok === targets.length ? 'info' : 'error',
    )
  }

  const summary = devices ? summarize(devices, integrationErrors) : null

  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">{greeting()}</h1>
        <p className="view-subtitle">Zuhause</p>
      </header>

      {fatal && <div className="card banner banner-error">{fatal}</div>}

      {summary && (
        <div className="card summary">
          <span className={`summary-dot ${summary.tone !== 'ok' ? summary.tone : ''}`} />
          <span className="summary-text">{summary.text}</span>
          <span className="summary-sub">
            {online} von {devices.length} Geräten online
          </span>
        </div>
      )}

      {loading && <DeviceListSkeleton />}

      {favorites.length > 0 && (
        <section className="section">
          <h2 className="section-title">Favoriten</h2>
          <div className="card-list cols-2">
            {favorites.map((d, i) => (
              <DeviceCard key={d.id} device={d} index={i} onOpen={setSelected} />
            ))}
          </div>
        </section>
      )}

      {covers.length > 0 && (
        <section className="section">
          <h2 className="section-title">Schnellaktionen</h2>
          <div className="quick-actions">
            <button
              className="card quick-action"
              disabled={bulkRunning}
              onClick={() => setConfirmAction('open')}
            >
              <span className="qa-icon">
                <IconUp />
              </span>
              Alles öffnen
              <span className="qa-sub">{covers.length} Rollläden</span>
            </button>
            <button
              className="card quick-action"
              disabled={bulkRunning}
              onClick={() => setConfirmAction('close')}
            >
              <span className="qa-icon">
                <IconDown />
              </span>
              Alles schließen
              <span className="qa-sub">{covers.length} Rollläden</span>
            </button>
          </div>
        </section>
      )}

      {groupByRoom(covers).map(({ room, devices: list }) => (
        <section className="section" key={room ?? 'ohne-raum'}>
          <h2 className="section-title">{room ?? 'Rollläden'}</h2>
          <div className="card-list cols-2">
            {list.map((d, i) => (
              <DeviceCard key={d.id} device={d} index={i} onOpen={setSelected} showRoom={false} />
            ))}
          </div>
        </section>
      ))}

      <DeviceSheet device={selected} onClose={() => setSelected(null)} />

      <BottomSheet
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        label="Massenaktion bestätigen"
      >
        <h2 className="sheet-title">
          {confirmAction === 'open' ? 'Alle Rollläden öffnen?' : 'Alle Rollläden schließen?'}
        </h2>
        <p className="sheet-sub" style={{ marginTop: 4 }}>
          Betrifft {covers.length} Rollläden in allen Räumen.
        </p>
        <div className="sheet-actions-confirm">
          <button className="btn btn-primary" onClick={() => runBulk(confirmAction)}>
            {confirmAction === 'open' ? 'Öffnen' : 'Schließen'}
          </button>
          <button className="btn btn-neutral" onClick={() => setConfirmAction(null)}>
            Abbrechen
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
