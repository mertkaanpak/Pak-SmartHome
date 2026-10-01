import { useEffect, useState } from 'react'
import { useDevices } from '../state/DevicesContext.jsx'
import { IconDown, IconStop, IconUp } from './icons.jsx'

// Bedienelemente für Geräte mit open/close/stop(/position).
// Ein Befehl gilt erst als erfolgreich, wenn das Backend bestätigt hat —
// bis dahin zeigt die Zeile „Befehl wird ausgeführt…".
export function CoverControls({ device, withSlider = true }) {
  const { command, pendingById } = useDevices()
  const busy = Boolean(pendingById[device.id])
  const [percent, setPercent] = useState(device.state.position ?? 0)

  // Position vom Gerät übernehmen, solange der Nutzer nicht gerade zieht
  useEffect(() => {
    if (!busy && device.state.position != null) setPercent(device.state.position)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.state.position])

  const can = (capability) => device.capabilities.includes(capability)

  return (
    <div className="cover-controls" style={{ display: 'grid', gap: 'var(--space-2)' }}>
      <div className="cover-actions">
        {can('open') && (
          <button
            className="control-btn"
            disabled={busy}
            onClick={() => command(device, 'open')}
            aria-label={`${device.name} hochfahren`}
          >
            <IconUp />
          </button>
        )}
        {can('stop') && (
          <button
            className="control-btn"
            disabled={busy}
            onClick={() => command(device, 'stop')}
            aria-label={`${device.name} stoppen`}
          >
            <IconStop size={18} />
          </button>
        )}
        {can('close') && (
          <button
            className="control-btn"
            disabled={busy}
            onClick={() => command(device, 'close')}
            aria-label={`${device.name} runterfahren`}
          >
            <IconDown />
          </button>
        )}
      </div>
      {withSlider && can('position') && (
        <div className="slider-row">
          <input
            type="range"
            min="0"
            max="100"
            value={percent}
            disabled={busy}
            aria-label={`${device.name} Zielposition`}
            onChange={(e) => setPercent(Number(e.target.value))}
            onMouseUp={() => command(device, 'setPosition', { percent })}
            onTouchEnd={() => command(device, 'setPosition', { percent })}
          />
          <span className="slider-value">{percent} %</span>
        </div>
      )}
      {busy && <p className="command-state">Befehl wird ausgeführt…</p>}
    </div>
  )
}
