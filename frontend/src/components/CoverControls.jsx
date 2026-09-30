import { useState } from 'react'
import { sendCommand } from '../api.js'
import { IconDown, IconStop, IconUp } from './icons.jsx'

// Bedienelemente für Geräte mit open/close/stop(/position).
// Ein Befehl gilt erst als erfolgreich, wenn das Backend bestätigt hat
// (kein Optimistic UI bei physischen Geräten).
export function CoverControls({ device, onCommandDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [percent, setPercent] = useState(device.state.position ?? 0)

  const run = async (command, params) => {
    setBusy(true)
    setError(null)
    try {
      await sendCommand(device.id, command, params)
      onCommandDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const can = (capability) => device.capabilities.includes(capability)

  return (
    <div className="cover-controls">
      <div className="cover-buttons">
        {can('open') && (
          <button disabled={busy} onClick={() => run('open')} aria-label={`${device.name} hochfahren`}>
            <IconUp />
          </button>
        )}
        {can('stop') && (
          <button disabled={busy} onClick={() => run('stop')} aria-label={`${device.name} stoppen`}>
            <IconStop size={18} />
          </button>
        )}
        {can('close') && (
          <button disabled={busy} onClick={() => run('close')} aria-label={`${device.name} runterfahren`}>
            <IconDown />
          </button>
        )}
      </div>
      {can('position') && (
        <div className="cover-position">
          <input
            type="range"
            min="0"
            max="100"
            value={percent}
            disabled={busy}
            aria-label={`${device.name} Zielposition`}
            onChange={(e) => setPercent(Number(e.target.value))}
            onMouseUp={() => run('setPosition', { percent })}
            onTouchEnd={() => run('setPosition', { percent })}
          />
          <span className="cover-percent">{percent} %</span>
        </div>
      )}
      {busy && <p className="control-hint">Sende Befehl…</p>}
      {error && <p className="control-error">{error}</p>}
    </div>
  )
}
