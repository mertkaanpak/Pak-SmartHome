import { useEffect, useState } from 'react'
import { fetchEvents } from '../api.js'

// Timeline-Daten: initial per REST, danach live über die SSE-Ereignisse,
// die der DevicesProvider app-weit als 'pak:event' verteilt.
export function useLiveEvents(limit = 50) {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchEvents(limit)
      .then((data) => setEvents(data.events))
      .catch((err) => setError(err.message))

    const onEvent = (e) => {
      setEvents((list) => (list ? [e.detail, ...list].slice(0, 200) : list))
    }
    window.addEventListener('pak:event', onEvent)
    return () => window.removeEventListener('pak:event', onEvent)
  }, [limit])

  return { events, error }
}
