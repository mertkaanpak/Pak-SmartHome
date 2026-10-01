// Stilisiertes Fenster mit animiertem Behang.
// Konvention der Anzeige: 0 % = offen, 100 % = geschlossen.
// Falls der physische Test ergibt, dass die Geräte die Skala invertiert
// melden, wird nur INVERT_POSITION umgestellt — sonst nichts.
export const INVERT_POSITION = false

export function coverageFromPosition(position) {
  if (position == null) return 0
  const value = INVERT_POSITION ? 100 - position : position
  return Math.max(0, Math.min(100, value))
}

export function CoverVisual({ position, large = false }) {
  return (
    <div className={`cover-visual ${large ? 'cover-visual-large' : ''}`} aria-hidden="true">
      <div
        className="cover-visual-shutter"
        style={{ height: `${coverageFromPosition(position)}%` }}
      />
    </div>
  )
}
