import { Router } from 'express'

export function createIntegrationsRouter(adapters) {
  const router = Router()

  // Status aller Integrationen inkl. Live-Verbindungstest
  router.get('/', async (req, res) => {
    const integrations = await Promise.all(
      adapters.map(async (adapter) => {
        const health = await adapter
          .healthCheck()
          .catch((err) => ({ status: 'error', message: err.message }))
        return {
          name: adapter.name,
          label: adapter.label,
          manufacturer: adapter.manufacturer,
          configured: adapter.configured,
          ...health,
        }
      }),
    )
    res.json({ integrations })
  })

  // Integrationsspezifische Diagnose-Routen (z. B. /api/integrations/tuya/…)
  for (const adapter of adapters) {
    if (adapter.router) router.use(`/${adapter.name}`, adapter.router)
  }

  return router
}
