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
const adapters = createAdapters()
const deviceService = createDeviceService({ db, adapters, events })
const scenes = createSceneService({ db, deviceService, events, audit })

// Frontend und Backend laufen hinter demselben Origin (Vite-Proxy bzw.
// später Reverse Proxy) — deshalb bewusst kein offenes CORS.
app.use('/api/auth', createAuthRouter(auth, events))
app.use('/api/devices', requireAuth, createDevicesRouter(deviceService, audit, events))
app.use('/api/events', requireAuth, createEventsRouter(events))
app.use('/api/scenes', requireAuth, createScenesRouter(scenes))
app.use('/api/integrations', requireAuth, createIntegrationsRouter(adapters))
app.use('/api/system', requireAuth, createSystemRouter({ db, adapters }))

app.use(notFound)
app.use(errorHandler)

const server = app.listen(config.port, () => {
  log.info(`SmartHome-Backend läuft auf http://localhost:${config.port}`)
})

function shutdown(signal) {
  log.info('Beende Server', { signal })
  server.close(() => {
    db.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
