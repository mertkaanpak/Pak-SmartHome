import { Router } from 'express'
import { z } from 'zod'
import { validateBody } from '../middleware/validate.js'

const commandSchema = z.discriminatedUnion('command', [
  z.object({ command: z.literal('open') }),
  z.object({ command: z.literal('close') }),
  z.object({ command: z.literal('stop') }),
  z.object({
    command: z.literal('setPosition'),
    params: z.object({ percent: z.number().int().min(0).max(100) }),
  }),
])

const metaSchema = z
  .object({
    name: z.string().trim().min(1).max(80).nullable().optional(),
    room: z.string().trim().min(1).max(80).nullable().optional(),
    favorite: z.boolean().optional(),
  })
  .strict()

const COMMAND_MESSAGES = {
  open: (name) => `„${name}" wird geöffnet`,
  close: (name) => `„${name}" wird geschlossen`,
  stop: (name) => `„${name}" wurde gestoppt`,
  setPosition: (name, params) => `„${name}" fährt auf ${params?.percent} %`,
}

export function createDevicesRouter(deviceService, audit, events) {
  const router = Router()

  // Einheitliche Geräteliste über alle Integrationen.
  // ?fresh=1 umgeht den kurzen Server-Cache (z. B. nach einem Befehl).
  router.get('/', async (req, res) => {
    const result = await deviceService.listDevices({ fresh: req.query.fresh === '1' })
    res.json(result)
  })

  router.get('/:id', async (req, res) => {
    res.json(await deviceService.getDevice(req.params.id))
  })

  router.post('/:id/commands', validateBody(commandSchema), async (req, res) => {
    const { command, params } = req.body
    const device = await deviceService.executeCommand(req.params.id, command, params)
    audit?.(req.user?.username, 'device.command', { device: req.params.id, command, params })
    events?.emit('device.command', {
      deviceId: device.id,
      username: req.user?.username,
      message: COMMAND_MESSAGES[command]?.(device.name, params) ?? `Befehl an „${device.name}"`,
    })
    res.json({ ok: true })
  })

  // Benutzer-Metadaten: Raum, Favorit, eigener Name
  router.patch('/:id', validateBody(metaSchema), async (req, res) => {
    const updated = await deviceService.updateMeta(req.params.id, req.body)
    audit?.(req.user?.username, 'device.meta_changed', { device: req.params.id, patch: req.body })
    res.json(updated)
  })

  return router
}
