import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { openDb } from './db.js'
import { createLogger } from './logger.js'
import { createAdapters } from './integrations/index.js'
import { createDeviceService } from './core/deviceService.js'
import { createDevicesRouter } from './routes/devices.js'
import { createIntegrationsRouter } from './routes/integrations.js'
import { createSystemRouter } from './routes/system.js'
import { errorHandler, notFound } from './middleware/errors.js'

const log = createLogger('server')

const app = express()
app.disable('x-powered-by')
app.use(express.json())
app.use(cors())

const db = openDb()
const adapters = createAdapters()
const deviceService = createDeviceService({ db, adapters })

app.use('/api/devices', createDevicesRouter(deviceService))
app.use('/api/integrations', createIntegrationsRouter(adapters))
app.use('/api/system', createSystemRouter({ db, adapters }))

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
