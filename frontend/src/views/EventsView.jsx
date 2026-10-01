import { useState } from 'react'
import { IconBell, IconBlinds, IconClock, IconScenes } from '../components/icons.jsx'
import { useLiveEvents } from '../hooks/useLiveEvents.js'
import { formatTime, groupByDay } from '../lib/time.js'

const FILTERS = [
  { key: 'all', label: 'Alle', match: () => true },
  { key: 'devices', label: 'Geräte', match: (e) => e.type.startsWith('device.') },
  { key: 'scenes', label: 'Szenen', match: (e) => e.type.startsWith('scene.') },
  { key: 'users', label: 'Anmeldungen', match: (e) => e.type.startsWith('user.') },
]

function eventIcon(type) {
  if (type.startsWith('scene.')) return IconScenes
  if (type.startsWith('user.')) return IconBell
  if (type.startsWith('device.')) return IconBlinds
  return IconClock
}

// Ereignis-Timeline: neueste zuerst, nach Tagen gruppiert, live über SSE.
export function EventsView() {
  const { events, error } = useLiveEvents(100)
  const [filter, setFilter] = useState('all')

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0]
  const visible = (events ?? []).filter(active.match)

  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">Ereignisse</h1>
        <p className="view-subtitle">Was in deinem Zuhause passiert ist</p>
      </header>

      <div className="chip-row" style={{ marginBottom: 'var(--space-5)' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? 'selected' : ''}`}
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="card banner banner-error">{error}</div>}
      {events && visible.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">
            <IconClock size={28} />
          </div>
          <h3>Noch keine Ereignisse</h3>
          <p>Sobald Geräte gesteuert werden oder Szenen laufen, erscheint hier die Historie.</p>
        </div>
      )}

      {groupByDay(visible).map((group) => (
        <section className="section" key={group.label}>
          <h2 className="timeline-day">{group.label}</h2>
          <div className="card timeline">
            {group.events.map((event) => {
              const EventIcon = eventIcon(event.type)
              return (
                <div className="timeline-row" key={event.id ?? `${event.time}-${event.message}`}>
                  <span className="timeline-time">{formatTime(event.time)}</span>
                  <span className="timeline-icon">
                    <EventIcon size={17} />
                  </span>
                  <span className="timeline-message">{event.message}</span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
