import { useEffect, useRef, useState } from 'react'

// Lässt eine Zahl weich auf ihren neuen Wert laufen (für Prozentanzeigen).
// Respektiert prefers-reduced-motion: dann springt der Wert direkt.
export function useAnimatedNumber(target, durationMs = 450) {
  const [value, setValue] = useState(target)
  const frame = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const from = value
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst nur bei neuem Zielwert animieren
  }, [target, durationMs])

  return value
}
