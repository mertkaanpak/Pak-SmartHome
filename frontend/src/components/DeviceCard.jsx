import { CoverControls } from './CoverControls.jsx'
import { TYPE_ICONS } from './icons.jsx'

const STATUS_LABELS = {
  ONLINE: 'Online',
  OFFLINE: 'Nicht erreichbar',
  UNKNOWN: 'Status unbekannt',
  ERROR: 'Fehler',
  CONNECTING: 'Verbinde…',
}

// Herstellerneutrale Gerätekarte: rendert Bedienelemente allein anhand
// der Capabilities. Welche Integration dahintersteckt, ist hier egal.
export function DeviceCard({ device, onCommandDone }) {
  const IconForType = TYPE_ICONS[device.type] ?? TYPE_ICONS.unknown
  const offline = device.status !== 'ONLINE'
  const hasCoverControls = ['open', 'close', 'stop'].some((c) =>
    device.capabilities.includes(c),
  )

  return (
    <article className={`device ${offline ? 'device-offline' : ''}`}>
      <div className="device-row">
        <span className="device-icon">
          <IconForType />
        </span>
        <span className="device-name">{device.name}</span>
        <span className={`status-pill ${offline ? 'pill-off' : 'pill-on'}`}>
          {STATUS_LABELS[device.status] ?? device.status}
        </span>
      </div>
      {hasCoverControls && <CoverControls device={device} onCommandDone={onCommandDone} />}
    </article>
  )
}
