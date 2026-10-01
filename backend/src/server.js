import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import { config } from './config.js'
import { openDb } from './db.js'
import { createLogger } from './logger.js'
import { createAdapters } from './integrations/index.js'
import { createDeviceService } from './core/deviceService.js'
import { createAudit } from './core/audit.js'
import { createAuthService } from './core/auth.js'
import { createEventBus } from './core/events.js'
import { createSceneService } from './core/sceneService.js'
import { createSecrets } from './core/secrets.js'
import { createSettingsService } from './core/settingsService.js'
import { createGateway } from './core/gateway.js'
import { createCamerasRouter } from './routes/cameras.js'
import { createPushService } from './core/pushService.js'
import { createPushRouter } from './routes/push.js'
import { createAutomationService } from './core/automationService.js'
import { createAutomationsRouter } from './routes/automations.js'
import { createAuthRouter } from './routes/auth.js'
import { createDevicesRouter } from './routes/devices.js'
import { createEventsRouter } from './routes/events.js'
import { createScenesRouter } from './routes/scenes.js'
import { createIntegrationsRouter } from './routes/integrations.js'
import { createSystemRouter } from './routes/system.js'
import { createRequireAuth } from './middleware/auth.js'
import { securityHeaders } from './middleware/security.js'
import { errorHandler, notFound } from './middleware/errors.js'

const log = createLogger('server')

const app = express()
app.disable('x-powered-by')
app.use(securityHeaders)
app.use(express.json())
app.use(cookieParser())

const db = openDb()
const audit = createAudit(db)
const auth = createAuthService(db, audit)
const requireAuth = createRequireAuth(auth)
const events = createEventBus(db)
const secrets = createSecrets(join(dirname(config.dbFile), 'secret.key'))
const settings = createSettingsService(db, secrets)
const gateway = createGateway({
  binaryPath: join(process.cwd(), '..', 'gateway', process.platform === 'win32' ? 'go2rtc.exe' : 'go2rtc'),
  configPath: join(process.cwd(), '..', 'gateway', 'go2rtc.yaml'),
})
const adapters = createAdapters({ settings, events, gateway })
const deviceService = createDeviceService({ db, adapters, events })
const scenes = createSceneService({ db, deviceService, events, audit })
const push = createPushService({ db, settings, events })
const automations = createAutomationService({
  db,
  scenes,
  events,
  audit,
  location: config.location,
})

// Frontend und Backend laufen hinter demselben Origin (Vite-Proxy bzw.
// später Reverse Proxy) — deshalb bewusst kein offenes CORS.
app.use('/api/auth', createAuthRouter(auth, events))
app.use('/api/devices', requireAuth, createDevicesRouter(deviceService, audit, events))
app.use('/api/events', requireAuth, createEventsRouter(events))
app.use('/api/scenes', requireAuth, createScenesRouter(scenes))
app.use('/api/automations', requireAuth, createAutomationsRouter(automations))
app.use('/api/push', requireAuth, createPushRouter(push))
app.use('/api/integrations', requireAuth, createIntegrationsRouter(adapters))
app.use(
  '/api/cameras',
  requireAuth,
  createCamerasRouter({
    camerasAdapter: adapters.find((a) => a.name === 'cameras'),
    gateway,
  }),
)
app.use('/api/system', requireAuth, createSystemRouter({ db, adapters }))

// Gebaute Frontend-App direkt mitliefern (frontend/dist), damit Handy &
// Co. nur einen Server brauchen. API-Routen bleiben davon unberührt;
// alle übrigen GET-Pfade bekommen die Single-Page-App (Router im Client).
const distDir = join(process.cwd(), '..', 'frontend', 'dist')
if (existsSync(join(distDir, 'index.html'))) {
  app.use(express.static(distDir))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(join(distDir, 'index.html'))
  })
  log.info('Frontend wird mit ausgeliefert', { distDir })
}

app.use(notFound)
app.use(errorHandler)

automations.start()
for (const adapter of adapters) adapter.initialize?.()

const server = app.listen(config.port, config.host, () => {
  log.info(`SmartHome-Backend läuft auf http://localhost:${config.port} (Host: ${config.host})`)
})

function shutdown(signal) {
  log.info('Beende Server', { signal })
  automations.stop()
  gateway.stop()
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
