import { Router } from 'express'

export function createEventsRouter(events) {
  const router = Router()

  // Timeline: neueste zuerst, Pagination über ?before=<timestamp>
  router.get('/', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const before = req.query.before ? Number(req.query.before) : undefined
    res.json({ events: events.list({ limit, before }) })
  })

  // Live-Updates als Server-Sent Events: der Browser (EventSource)
  // verbindet sich einmal und bekommt jedes neue Ereignis sofort —
  // keine Polling-Flut Richtung Backend oder Tuya.
  router.get('/stream', (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    })
    res.flushHeaders()
    res.write(': verbunden\n\n')

    const unsubscribe = events.subscribe((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`)
    })
    // Keep-alive gegen Proxy-Timeouts
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000)

    req.on('close', () => {
      clearInterval(ping)
      unsubscribe()
    })
  })

  return router
}
