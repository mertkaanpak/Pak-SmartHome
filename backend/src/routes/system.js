import { Router } from 'express'

export function createSystemRouter({ db, adapters }) {
  const router = Router()
  const startedAt = Date.now()

  router.get('/health', (req, res) => {
    let database = 'ok'
    try {
      db.prepare('SELECT 1').get()
    } catch {
      database = 'error'
    }

    res.json({
      status: database === 'ok' ? 'ok' : 'degraded',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      database,
      integrations: adapters.map((a) => ({
        name: a.name,
        label: a.label,
        configured: a.configured,
      })),
    })
  })

  return router
}
