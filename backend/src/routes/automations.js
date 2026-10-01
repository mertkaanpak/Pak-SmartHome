import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'

const triggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('time'),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Uhrzeit im Format HH:MM'),
  }),
  z.object({
    type: z.literal('sun'),
    event: z.enum(['sunrise', 'sunset']),
    offsetMinutes: z.number().int().min(-120).max(120).default(0),
  }),
])

const automationSchema = z.object({
  name: z.string().trim().min(1, 'Name darf nicht leer sein').max(60),
  enabled: z.boolean().optional(),
  trigger: triggerSchema,
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Mindestens ein Wochentag').max(7),
  sceneId: z.number().int(),
})

const automationPatchSchema = automationSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'Leere Änderung')

export function createAutomationsRouter(automations) {
  const router = Router()

  router.get('/', (req, res) => {
    res.json({ automations: automations.list() })
  })

  router.post('/', validateBody(automationSchema), (req, res) => {
    res.status(201).json(automations.create(req.body, req.user?.username))
  })

  router.patch('/:id', validateBody(automationPatchSchema), (req, res) => {
    res.json(automations.update(Number(req.params.id), req.body, req.user?.username))
  })

  router.delete('/:id', (req, res) => {
    automations.remove(Number(req.params.id), req.user?.username)
    res.json({ ok: true })
  })

  router.post('/:id/run', async (req, res) => {
    res.json(await automations.runNow(Number(req.params.id), req.user?.username))
  })

  return router
}
