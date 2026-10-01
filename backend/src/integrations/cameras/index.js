import { randomUUID } from 'node:crypto'
import { Socket } from 'node:net'
import { Router } from 'express'
import { z } from 'zod'
import { createLogger } from '../../logger.js'
import { HttpError, IntegrationError } from '../../errors.js'
import { Capability, DeviceStatus, DeviceType } from '../../core/capabilities.js'
import { validateBody } from '../../middleware/validate.js'

// Kameras (EseeCloud-Hardware u. a.) — lokal angebunden, ohne Hersteller-
// Cloud. Die Streams liefert das Media-Gateway (go2rtc) als WebRTC an die
// App; Quellen: EseeCloud-HTTP (JA-Modelle) oder klassisches RTSP.
// Kameradaten (inkl. Passwort) liegen verschlüsselt in der Datenbank.

const PROBE_TIMEOUT_MS = 2500

const cameraSchema = z.object({
  name: z.string().trim().min(1, 'Name darf nicht leer sein').max(60),
  host: z
    .string()
    .trim()
    .min(3)
    .max(100)
    .regex(/^[a-zA-Z0-9.\-:]+$/, 'IP-Adresse oder Hostname prüfen'),
  username: z.string().trim().max(60).default('admin'),
  password: z.string().max(100).default(''),
  source: z.enum(['eseecloud', 'rtsp']).default('eseecloud'),
  // Optionaler Pfad, falls das Standardmuster nicht passt
  path: z.string().trim().max(120).optional(),
})

// Prüft, ob die Kamera im Netz antwortet (TCP-Handshake, kein Login)
function probeTcp(host, port) {
  return new Promise((resolve) => {
    const socket = new Socket()
    const done = (ok) => {
      socket.destroy()
      resolve(ok)
    }
    socket.setTimeout(PROBE_TIMEOUT_MS)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })
}

export function sourceUrl(camera) {
  const auth = `${encodeURIComponent(camera.username)}:${encodeURIComponent(camera.password)}`
  if (camera.source === 'rtsp') {
    const path = camera.path ?? 'ch0_0.264'
    return `rtsp://${auth}@${camera.host}:554/${path.replace(/^\//, '')}`
  }
  const path = camera.path ?? 'livestream/11'
  return `eseecloud://${auth}@${camera.host}:80/${path.replace(/^\//, '')}`
}

const probePort = (camera) => (camera.source === 'rtsp' ? 554 : 80)
const streamName = (camera) => `cam_${camera.id}`

export function createCamerasAdapter({ settings, gateway } = {}) {
  const log = createLogger('cameras')

  const listCameras = () => settings?.get('cameras')?.list ?? []
  const saveCameras = (list) => settings.set('cameras', { list })

  async function registerStreams() {
    if (!(await gateway?.ping())) return
    for (const camera of listCameras()) {
      await gateway
        .setStream(streamName(camera), sourceUrl(camera))
        .catch((err) => log.warn('Stream-Registrierung fehlgeschlagen', {
          camera: camera.name,
          error: err.message,
        }))
    }
  }

  const router = Router()

  // Liste für die App — niemals Passwörter zurückgeben
  router.get('/cameras', async (req, res) => {
    res.json({
      cameras: listCameras().map(({ password, ...safe }) => safe),
      gateway: {
        available: gateway?.available() ?? false,
        running: (await gateway?.ping()) ?? false,
      },
    })
  })

  router.post('/cameras', validateBody(cameraSchema), async (req, res) => {
    const camera = { id: randomUUID().slice(0, 8), ...req.body }
    saveCameras([...listCameras(), camera])
    await gateway?.setStream(streamName(camera), sourceUrl(camera)).catch(() => {})
    const { password, ...safe } = camera
    res.status(201).json(safe)
  })

  router.delete('/cameras/:id', async (req, res) => {
    const cameras = listCameras()
    const camera = cameras.find((c) => c.id === req.params.id)
    if (!camera) throw new HttpError(404, 'Kamera nicht gefunden')
    saveCameras(cameras.filter((c) => c.id !== req.params.id))
    await gateway?.removeStream(streamName(camera))
    res.json({ ok: true })
  })

  // Erreichbarkeitstest aus der App ("Verbindung testen")
  router.post('/cameras/:id/test', async (req, res) => {
    const camera = listCameras().find((c) => c.id === req.params.id)
    if (!camera) throw new HttpError(404, 'Kamera nicht gefunden')
    const reachable = await probeTcp(camera.host, probePort(camera))
    res.json({
      reachable,
      message: reachable
        ? `„${camera.name}" antwortet unter ${camera.host}`
        : `„${camera.name}" ist unter ${camera.host} nicht erreichbar — IP prüfen (und ob dieser Rechner im selben Netz ist)`,
    })
  })

  return {
    name: 'cameras',
    label: 'Kameras',
    manufacturer: 'EseeCloud/RTSP',
    get configured() {
      return listCameras().length > 0
    },
    router,

    initialize() {
      gateway?.start()
      // Streams registrieren, sobald go2rtc hochgefahren ist
      if (gateway?.available()) setTimeout(() => registerStreams(), 1500)
    },

    async getDevices() {
      const cameras = listCameras()
      const reachability = await Promise.all(
        cameras.map((camera) => probeTcp(camera.host, probePort(camera))),
      )
      return cameras.map((camera, index) => ({
        id: `cameras:${camera.id}`,
        externalId: camera.id,
        name: camera.name,
        room: null,
        type: DeviceType.CAMERA,
        manufacturer: camera.source === 'rtsp' ? 'RTSP' : 'EseeCloud',
        integration: 'cameras',
        status: reachability[index] ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
        lastSeen: null,
        capabilities: [Capability.STREAM],
        state: {},
      }))
    },

    async executeCommand() {
      throw new IntegrationError('Kameras unterstützen hier keine Befehle')
    },

    async healthCheck() {
      if (!gateway?.available()) {
        return {
          status: 'error',
          message: 'Media-Gateway (go2rtc) fehlt — siehe README, Ordner gateway/',
        }
      }
      if (listCameras().length === 0) return { status: 'not_configured' }
      return (await gateway.ping())
        ? { status: 'connected' }
        : { status: 'error', message: 'Media-Gateway läuft nicht' }
    },

    // Für den WebRTC-Router
    getCamera(id) {
      return listCameras().find((c) => c.id === id) ?? null
    },
  }
}
