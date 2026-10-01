import { useEffect, useState } from 'react'

// Mobiles Bottom-Sheet mit natürlicher Ein-/Ausblendbewegung.
// Schließen über Backdrop-Tipp oder Escape.
export function BottomSheet({ open, onClose, children, label }) {
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open && !closing) return null

  function requestClose() {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 150)
  }

  return (
    <>
      <div
        className={`sheet-backdrop ${closing ? 'closing' : ''}`}
        onClick={requestClose}
        aria-hidden="true"
      />
      <div
        className={`sheet ${closing ? 'closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="sheet-grabber" aria-hidden="true" />
        {children}
      </div>
    </>
  )
}
