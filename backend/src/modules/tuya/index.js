import { Router } from 'express'
import { TuyaContext } from '@tuya/tuya-connector-nodejs'
import { config } from '../../config.js'

// Modul für die Rollläden über die Tuya Cloud API (SmartLife-App).
// Voraussetzung: Cloud-Projekt auf iot.tuya.com (EU-Rechenzentrum) mit
// verknüpftem SmartLife-Konto; Zugangsdaten in backend/.env.

// Rollladen-/Vorhang-Kategorien bei Tuya: cl = Vorhang(-motor), clkg = Vorhang-
// schalter, cljkq = Vorhang-Controller. Steuerbefehle laufen über den DP-Code
// "control" (open/close/stop) bzw. "percent_control" für Zielposition.
const COVER_CATEGORIES = new Set(['cl', 'clkg', 'cljkq'])
const COVER_ACTIONS = new Set(['open', 'close', 'stop'])

export function createTuyaModule(db) {
  const router = Router()
  const configured = Boolean(config.tuya.accessId && config.tuya.accessSecret)

  const tuya = configured
    ? new TuyaContext({
        baseUrl: config.tuya.apiUrl,
        accessKey: config.tuya.accessId,
        secretKey: config.tuya.accessSecret,
      })
    : null

  function requireConfigured(req, res, next) {
    if (!tuya) {
      return res.status(503).json({
        error: 'Tuya nicht konfiguriert — TUYA_ACCESS_ID/SECRET in backend/.env eintragen',
      })
    }
    next()
  }
  router.use(requireConfigured)

  // Alle mit dem SmartLife-Konto verknüpften Geräte
  router.get('/devices', async (req, res) => {
    const result = await tuya.request({
      method: 'GET',
      path: '/v1.0/iot-01/associated-users/devices',
      query: { size: 50 },
    })
    if (!result.success) {
      return res.status(502).json({ error: result.msg, code: result.code })
    }
    const devices = (result.result.devices ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      productName: d.product_name,
      online: d.online,
      isCover: COVER_CATEGORIES.has(d.category),
      status: Object.fromEntries((d.status ?? []).map((s) => [s.code, s.value])),
    }))
    res.json({ devices })
  })

  // Unterstützte Befehle eines Geräts (zum Erkunden der DP-Codes)
  router.get('/devices/:id/functions', async (req, res) => {
    const result = await tuya.request({
      method: 'GET',
      path: `/v1.0/devices/${req.params.id}/functions`,
    })
    if (!result.success) {
      return res.status(502).json({ error: result.msg, code: result.code })
    }
    res.json(result.result)
  })

  // Rollladen fahren: open | close | stop
  router.post('/covers/:id/:action', async (req, res) => {
    const { id, action } = req.params
    if (!COVER_ACTIONS.has(action)) {
      return res.status(400).json({ error: `Unbekannte Aktion: ${action}` })
    }
    const result = await tuya.request({
      method: 'POST',
      path: `/v1.0/devices/${id}/commands`,
      body: { commands: [{ code: 'control', value: action }] },
    })
    if (!result.success) {
      return res.status(502).json({ error: result.msg, code: result.code })
    }
    res.json({ ok: true })
  })

  // Rollladen auf Zielposition fahren (0–100 %)
  router.post('/covers/:id/position', async (req, res) => {
    const percent = Number(req.body?.percent)
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
      return res.status(400).json({ error: 'percent muss eine Zahl von 0 bis 100 sein' })
    }
    const result = await tuya.request({
      method: 'POST',
      path: `/v1.0/devices/${req.params.id}/commands`,
      body: { commands: [{ code: 'percent_control', value: percent }] },
    })
    if (!result.success) {
      return res.status(502).json({ error: result.msg, code: result.code })
    }
    res.json({ ok: true })
  })

  return {
    name: 'tuya',
    label: 'Rollläden',
    router,
    getStatus: () => ({ configured, ready: configured }),
  }
}
