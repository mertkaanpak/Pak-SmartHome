import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'

const actionSchema = z.object({
  deviceId: z.string().min(1),
  command: z.enum(['open', 'close', 'stop', 'setPosition']),
  params: z.object({ percent: z.number().int().min(0).max(100) }).optional(),
})

const sceneSchema = z.object({
  name: z.string().trim().min(1, 'Name darf nicht leer sein').max(60),
  icon: z.enum(['scene', 'moon', 'sun', 'leave']).optional(),
  actions: z.array(actionSchema).min(1, 'Mindestens eine Aktion').max(50),
})

const scenePatchSchema = sceneSchema.partial().refine(
  (patch) => Object.keys(patch).length > 0,
  'Leere Änderung',
)

export function createScenesRouter(scenes) {
  const router = Router()

  router.get('/', (req, res) => {
    res.json({ scenes: scenes.list() })
  })

  router.post('/', validateBody(sceneSchema), (req, res) => {
    res.status(201).json(scenes.create(req.body, req.user?.username))
  })

  router.patch('/:id', validateBody(scenePatchSchema), (req, res) => {
    res.json(scenes.update(Number(req.params.id), req.body, req.user?.username))
  })

  router.delete('/:id', (req, res) => {
    scenes.remove(Number(req.params.id), req.user?.username)
    res.json({ ok: true })
  })

  router.post('/:id/execute', async (req, res) => {
    res.json(await scenes.execute(Number(req.params.id), req.user?.username))
  })

  return router
}
