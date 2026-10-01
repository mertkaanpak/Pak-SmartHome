import { useState } from 'react'
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js'
import { useDevices } from '../state/DevicesContext.jsx'
import { BottomSheet } from './BottomSheet.jsx'
import { CoverControls } from './CoverControls.jsx'
import { CoverVisual } from './CoverVisual.jsx'
import { IconClose, IconStar } from './icons.jsx'

const ROOM_PRESETS = [
  'Wohnzimmer',
  'Schlafzimmer',
  'Küche',
  'Essbereich',
  'Büro',
  'Badezimmer',
  'Ankleidezimmer',
  'Kinderzimmer',
  'Flur',
  'Terrasse',
]

// Detailansicht eines Geräts als Bottom-Sheet: große Visualisierung,
// animierter Prozentwert, volle Bedienung, Favorit und Raumzuordnung.
export function DeviceSheet({ device, onClose }) {
  const { devices, updateMeta } = useDevices()
  // Immer die aktuelle Fassung aus dem Store anzeigen (Live-Position)
  const current = devices?.find((d) => d.id === device?.id) ?? device
  const open = Boolean(device)

  if (!open) return null
  return (
    <BottomSheet open={open} onClose={onClose} label={`Details zu ${current.name}`}>
      <SheetContent device={current} updateMeta={updateMeta} onClose={onClose} />
    </BottomSheet>
  )
}

function SheetContent({ device, updateMeta, onClose }) {
  const isCover = device.type === 'cover'
  const animatedPosition = useAnimatedNumber(device.state.position ?? 0)
  const [savingRoom, setSavingRoom] = useState(false)

  const toggleFavorite = () => updateMeta(device, { favorite: !device.favorite })

  const setRoom = async (room) => {
    setSavingRoom(true)
    await updateMeta(device, { room: device.room === room ? null : room })
    setSavingRoom(false)
  }

  return (
    <>
      <div className="sheet-head">
        <div>
          <h2 className="sheet-title">{device.name}</h2>
          <p className="sheet-sub">
            {device.room ?? 'Kein Raum zugewiesen'}
            {device.status !== 'ONLINE' && ' · Nicht erreichbar'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className={`icon-btn ${device.favorite ? 'active' : ''}`}
            onClick={toggleFavorite}
            aria-label={device.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}
            aria-pressed={device.favorite}
          >
            <IconStar size={19} filled={device.favorite} />
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Schließen">
            <IconClose size={19} />
          </button>
        </div>
      </div>

      {isCover && (
        <>
          <CoverVisual position={device.state.position} large />
          <div className="sheet-percent">
            <div className="sheet-percent-value">{animatedPosition} %</div>
            <div className="sheet-percent-label">Position</div>
          </div>
          <CoverControls device={device} />
        </>
      )}

      <div className="sheet-section">
        <h3 className="sheet-section-title">Raum</h3>
        <div className="chip-row">
          {ROOM_PRESETS.map((room) => (
            <button
              key={room}
              className={`chip ${device.room === room ? 'selected' : ''}`}
              disabled={savingRoom}
              onClick={() => setRoom(room)}
              aria-pressed={device.room === room}
            >
              {room}
            </button>
          ))}
        </div>
      </div>

      <p className="sheet-meta">
        Integration: {device.manufacturer} · Geräte-ID: {device.externalId}
      </p>
    </>
  )
}
