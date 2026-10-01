import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
  expirationTime: z.any().optional(),
})

const unsubscribeSchema = z.object({ endpoint: z.string().min(1) })

export function createPushRouter(push) {
  const router = Router()

  // Öffentlicher VAPID-Schlüssel (kein Geheimnis) — der Browser braucht ihn
  // zum Anlegen des Abos.
  router.get('/key', (req, res) => {
    res.json({ key: push.publicKey() })
  })

  router.post('/subscribe', validateBody(subscriptionSchema), (req, res) => {
    push.subscribe(req.body)
    res.json({ ok: true })
  })

  router.post('/unsubscribe', validateBody(unsubscribeSchema), (req, res) => {
    push.unsubscribe(req.body.endpoint)
    res.json({ ok: true })
  })

  // Testbenachrichtigung ("Probe-Push" aus der App)
  router.post('/test', async (req, res) => {
    await push.notify({
      title: 'Pak SmartHome',
      body: 'Test-Benachrichtigung — Push funktioniert ✓',
      url: '/',
      tag: 'test',
    })
    res.json({ ok: true, subscriptions: push.count() })
  })

  return router
}
