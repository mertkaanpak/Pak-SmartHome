import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cameraWebrtcOffer, ringLiveStart, ringLiveStop } from '../api.js'
import { CameraPlayer } from '../components/CameraPlayer.jsx'
import { IconCamera, IconRefresh } from '../components/icons.jsx'
import { useDevices } from '../state/DevicesContext.jsx'

// Signaling-Varianten: lokales Gateway (go2rtc) vs. Ring-Cloud
const negotiateLocal = (cameraId) => async (offer) => ({
  sdp: await cameraWebrtcOffer(cameraId, offer),
})

const negotiateRing = (cameraId) => async (offer) => {
  const { sdp, sessionId } = await ringLiveStart(cameraId, offer)
  return { sdp, close: () => ringLiveStop(sessionId) }
}

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

  // Alles mit Kamerabild: lokale Kameras (Live-Stream) und Ring-Geräte
  // inklusive Türklingel (Standbild)
  const cameras = (devices ?? []).filter(
    (d) => d.type === 'camera' || d.capabilities.includes('snapshot'),
  )

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
                  <CameraPlayer
                    negotiate={
                      camera.integration === 'ring'
                        ? negotiateRing(camera.externalId)
                        : negotiateLocal(camera.externalId)
                    }
                    name={camera.name}
                  />
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
                <>
                  <button
                    className="camera-start"
                    onClick={() => setActiveId(camera.externalId)}
                  >
                    <IconCamera size={18} /> Live ansehen
                  </button>
                  {camera.integration === 'ring' && <RingSnapshot camera={camera} />}
                </>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

// Ring liefert (noch) Standbilder statt Live-Video — ehrlich beschriftet.
// Das Bild wird erst auf Wunsch geladen; Batteriekameras brauchen etwas.
function RingSnapshot({ camera }) {
  const [loadedAt, setLoadedAt] = useState(null)
  const [state, setState] = useState('idle') // idle | loading | ready | error

  const load = () => {
    setState('loading')
    setLoadedAt(Date.now())
  }

  return (
    <div>
      {loadedAt && (
        <div className="camera-player">
          <img
            className="camera-video"
            src={`/api/integrations/ring/cameras/${camera.externalId}/snapshot?t=${loadedAt}`}
            alt={`Standbild von ${camera.name}`}
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
          />
          {state === 'loading' && <div className="camera-overlay">Hole Standbild…</div>}
          {state === 'error' && (
            <div className="camera-overlay camera-overlay-error">
              Kein Standbild verfügbar — die Kamera ist evtl. im Energiesparmodus
            </div>
          )}
        </div>
      )}
      <button className="camera-start" onClick={load} disabled={state === 'loading'}>
        <IconRefresh size={17} />
        {loadedAt ? 'Standbild aktualisieren' : 'Standbild anzeigen'}
      </button>
    </div>
  )
}
