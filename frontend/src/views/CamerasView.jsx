import { IconCamera } from '../components/icons.jsx'

// Ehrlicher Zustand: Kameras sind noch nicht angebunden (ONVIF/RTSP-Check
// steht aus, bis das Kameramodell bekannt ist). Keine Fake-Kameras.
export function CamerasView() {
  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">Kameras</h1>
        <p className="view-subtitle">Live-Ansichten deiner Überwachungskameras</p>
      </header>

      <div className="card empty-state">
        <div className="empty-icon">
          <IconCamera size={28} />
        </div>
        <h3>Noch keine Kameras eingerichtet</h3>
        <p>
          Die Kamera-Anbindung (lokal per ONVIF/RTSP) wird eingerichtet, sobald das
          Kameramodell geprüft ist. Die Streams laufen dann hier — ohne Hersteller-Cloud.
        </p>
      </div>
    </div>
  )
}
