import { Router } from 'express'
import { config } from '../../config.js'

// Modul für die Ring-Türklingel über ring-client-api.
// Wird in Schritt 3 implementiert (Refresh-Token per ring-auth-cli erzeugen).
export function createRingModule(db) {
  const router = Router()

  router.get('/devices', (req, res) => {
    res.status(501).json({ error: 'Ring-Integration noch nicht implementiert' })
  })

  return {
    name: 'ring',
    label: 'Türklingel',
    router,
    getStatus: () => ({
      configured: Boolean(config.ring.refreshToken),
      ready: false,
    }),
  }
}
