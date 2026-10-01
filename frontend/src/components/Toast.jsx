import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { IconAlert } from './icons.jsx'

const ToastContext = createContext(null)

// Dezente, selbstschließende Hinweise am unteren Rand — kein Alert-Dialog.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const show = useCallback((message, variant = 'info') => {
    const id = ++counter.current
    setToasts((list) => [...list.slice(-2), { id, message, variant }])
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id))
    }, 3200)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.variant === 'error' ? 'toast-error' : ''}`}>
            {t.variant === 'error' && <IconAlert size={16} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
