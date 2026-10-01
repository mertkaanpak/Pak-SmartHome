import { useState } from 'react'
import { DeviceCard } from '../components/DeviceCard.jsx'
import { DeviceSheet } from '../components/DeviceSheet.jsx'
import { DeviceListSkeleton } from '../components/Skeleton.jsx'
import { IconChevronRight, IconRooms } from '../components/icons.jsx'
import { useDevices } from '../state/DevicesContext.jsx'
import { groupByRoom } from '../lib/rooms.js'

// Raumansicht: Räume als aufklappbare Gruppen mit Gerätezahl und Status.
export function RoomsView() {
  const { devices, loading } = useDevices()
  const [openRoom, setOpenRoom] = useState(null)
  const [selected, setSelected] = useState(null)

  const groups = groupByRoom(devices ?? [])

  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">Räume</h1>
        <p className="view-subtitle">Geräte nach Räumen geordnet</p>
      </header>

      {loading && <DeviceListSkeleton />}

      {!loading && groups.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">
            <IconRooms size={28} />
          </div>
          <h3>Noch keine Geräte</h3>
          <p>Sobald Geräte verbunden sind, erscheinen sie hier nach Räumen sortiert.</p>
        </div>
      )}

      <div className="card-list">
        {groups.map(({ room, devices: list }, i) => {
          const key = room ?? 'Ohne Raum'
          const isOpen = openRoom === key
          const online = list.filter((d) => d.status === 'ONLINE').length
          return (
            <div key={key} style={{ '--i': i }}>
              <div className="card">
                <button
                  className="room-row"
                  onClick={() => setOpenRoom(isOpen ? null : key)}
                  aria-expanded={isOpen}
                >
                  <span className="room-row-info">
                    <span className="room-row-name">{room ?? 'Ohne Raum'}</span>
                    <span className="room-row-meta">
                      {' '}
                      <br />
                      {list.length} {list.length === 1 ? 'Gerät' : 'Geräte'} · {online} online
                    </span>
                  </span>
                  <span className={`room-chevron ${isOpen ? 'open' : ''}`}>
                    <IconChevronRight size={18} />
                  </span>
                </button>
              </div>
              {isOpen && (
                <div className="room-devices">
                  {list.map((d, j) => (
                    <DeviceCard key={d.id} device={d} index={j} onOpen={setSelected} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!loading && groups.some((g) => g.room === null) && (
        <p className="sheet-meta">
          Tipp: Den Raum eines Geräts legst du in dessen Detailansicht fest — Gerät antippen.
        </p>
      )}

      <DeviceSheet device={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
