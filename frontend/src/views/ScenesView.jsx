import { IconScenes } from '../components/icons.jsx'

// Ehrlicher Zustand: Szenen-System ist noch nicht implementiert.
// Keine Buttons, die nichts tun.
export function ScenesView() {
  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">Szenen</h1>
        <p className="view-subtitle">Mehrere Aktionen mit einem Tipp</p>
      </header>

      <div className="card empty-state">
        <div className="empty-icon">
          <IconScenes size={28} />
        </div>
        <h3>Szenen sind noch nicht verfügbar</h3>
        <p>
          Hier entstehen Abläufe wie „Gute Nacht" oder „Haus verlassen", die mehrere
          Rollläden und Geräte gleichzeitig steuern. Dieses Modul folgt in einem der
          nächsten Updates.
        </p>
      </div>
    </div>
  )
}
