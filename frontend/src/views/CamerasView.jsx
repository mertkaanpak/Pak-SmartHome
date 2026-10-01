import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CameraPlayer } from '../components/CameraPlayer.jsx'
import { IconCamera } from '../components/icons.jsx'
import { useDevices } from '../state/DevicesContext.jsx'

const STATUS_LABELS = {
  ONLINE: { text: 'Online', pill: 'pill-ok' },
  OFFLINE: { text: 'Nicht erreichbar', pill: 'pill-danger' },
  UNKNOWN: { text: 'Status unbekannt', pill: 'pill-muted' },
}

// Kamera-Zentrale: Streams starten bewusst erst auf Tipp (Performance,
// kein Dauerstreaming im Hintergrund).
export function CamerasView() {
  const { devices } = useDevices()
  const [activeId, setActiveId] = useState(null)

  const cameras = (devices ?? []).filter((d) => d.type === 'camera')

  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">Kameras</h1>
        <p className="view-subtitle">Live-Ansichten deiner Überwachungskameras</p>
      </header>

      {cameras.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">
            <IconCamera size={28} />
          </div>
          <h3>Noch keine Kameras eingerichtet</h3>
          <p>
            Füge deine Kameras unter <Link to="/integrationen">Integrationen</Link> hinzu —
            mit IP-Adresse und Kamera-Passwort, lokal ohne Hersteller-Cloud.
          </p>
        </div>
      )}

      <div className="card-list">
        {cameras.map((camera, i) => {
          const status = STATUS_LABELS[camera.status] ?? STATUS_LABELS.UNKNOWN
          const active = activeId === camera.externalId
          return (
            <article key={camera.id} className="card camera-card" style={{ '--i': i }}>
              <div className="device-row" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <span className="device-icon">
                  <IconCamera />
                </span>
                <span className="device-card-info">
                  <span className="device-card-name">{camera.name}</span>
                  {camera.room && <span className="device-card-meta">{camera.room}</span>}
                </span>
                <span className={`pill ${status.pill}`}>{status.text}</span>
              </div>
              {active ? (
                <>
                  <CameraPlayer cameraId={camera.externalId} name={camera.name} />
                  <div className="camera-actions">
                    <button
                      className="chip"
                      onClick={(e) =>
                        e.currentTarget
                          .closest('.camera-card')
                          ?.querySelector('video')
                          ?.requestFullscreen?.()
                      }
                    >
                      Vollbild
                    </button>
                    <button className="chip" onClick={() => setActiveId(null)}>
                      Stream beenden
                    </button>
                  </div>
                </>
              ) : (
                <button className="camera-start" onClick={() => setActiveId(camera.externalId)}>
                  <IconCamera size={18} /> Live ansehen
                </button>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
