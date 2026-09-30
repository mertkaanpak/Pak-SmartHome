import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { openDb } from './db.js'
import { createModules } from './modules/index.js'

const app = express()
app.use(express.json())
app.use(cors())

const db = openDb()
const modules = createModules(db)

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/status', (req, res) => {
  res.json({
    modules: modules.map((m) => ({
      name: m.name,
      label: m.label,
      ...m.getStatus(),
    })),
  })
})

for (const m of modules) {
  app.use(`/api/${m.name}`, m.router)
}

app.listen(config.port, () => {
  console.log(`SmartHome-Backend läuft auf http://localhost:${config.port}`)
})
