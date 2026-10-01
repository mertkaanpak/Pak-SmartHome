import { CoverControls } from './CoverControls.jsx'
import { CoverVisual } from './CoverVisual.jsx'
import { TYPE_ICONS } from './icons.jsx'

const STATUS_LABELS = {
  ONLINE: 'Online',
  OFFLINE: 'Nicht erreichbar',
  UNKNOWN: 'Status unbekannt',
  ERROR: 'Fehler',
  CONNECTING: 'Verbinde…',
}

const STATUS_PILL = {
  ONLINE: 'pill-ok',
  OFFLINE: 'pill-danger',
  UNKNOWN: 'pill-muted',
  ERROR: 'pill-danger',
  CONNECTING: 'pill-muted',
}

// Herstellerneutrale Gerätekarte. Tipp auf die Karte öffnet die
// Detailansicht; die Schnellbedienung liegt direkt auf der Karte.
export function DeviceCard({ device, onOpen, index = 0, showRoom = true }) {
  const offline = device.status !== 'ONLINE'
  const isCover = device.type === 'cover'
  const IconForType = TYPE_ICONS[device.type] ?? TYPE_ICONS.unknown

  const meta = [
    showRoom ? device.room : null,
    isCover && device.state.position != null ? `${device.state.position} %` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article
      className={`card device-card ${offline ? 'device-card-offline' : ''}`}
      style={{ '--i': index }}
    >
      <button
        className="device-card-main"
        onClick={() => onOpen?.(device)}
        aria-label={`${device.name}, Details öffnen`}
      >
        {isCover ? (
          <CoverVisual position={device.state.position} />
        ) : (
          <span className="device-icon" style={{ color: 'var(--accent)' }}>
            <IconForType />
          </span>
        )}
        <span className="device-card-info">
          <span className="device-card-name">{device.name}</span>
          <span className="device-card-meta">{meta || '—'}</span>
        </span>
        <span className={`pill ${STATUS_PILL[device.status] ?? 'pill-muted'}`}>
          {STATUS_LABELS[device.status] ?? device.status}
        </span>
      </button>
      {isCover && <CoverControls device={device} withSlider={false} />}
    </article>
  )
}
