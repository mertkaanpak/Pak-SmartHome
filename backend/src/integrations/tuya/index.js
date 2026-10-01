import { Router } from 'express'
import { TuyaContext } from '@tuya/tuya-connector-nodejs'
import { z } from 'zod'
import { config } from '../../config.js'
import { createLogger } from '../../logger.js'
import { IntegrationError } from '../../errors.js'
import { withTimeout } from '../../core/async.js'
import { Capability, DeviceStatus, DeviceType } from '../../core/capabilities.js'
import { validateBody } from '../../middleware/validate.js'

const REQUEST_TIMEOUT_MS = 10_000

// Rollladen-/Vorhang-Kategorien bei Tuya: cl = Vorhangmotor, clkg = Vorhang-
// schalter, cljkq = Vorhang-Controller.
const COVER_CATEGORIES = new Set(['cl', 'clkg', 'cljkq'])

// Bekannte Tuya-Fehlercodes mit verständlicher Meldung (§57: keine rohen
// API-Fehler für Benutzer). Alles andere bekommt die generische Meldung.
const KNOWN_ERRORS = {
  28841002:
    'Tuya-Probeabo abgelaufen — unter iot.tuya.com den IoT-Core-Dienst kostenlos verlängern',
  1106: 'Tuya-Zugriff verweigert — Projekt-Berechtigungen und Rechenzentrum prüfen',
  1004: 'Tuya-Signatur ungültig — Access ID/Secret prüfen',
}

// Abbildung der einheitlichen Befehle auf Tuya-DP-Codes.
const COMMANDS = {
  open: () => ({ code: 'control', value: 'open' }),
  close: () => ({ code: 'control', value: 'close' }),
  stop: () => ({ code: 'control', value: 'stop' }),
  setPosition: (params) => ({ code: 'percent_control', value: params.percent }),
}

export const TUYA_DATACENTERS = [
  { url: 'https://openapi.tuyaeu.com', label: 'Europa' },
  { url: 'https://openapi.tuyaus.com', label: 'USA' },
  { url: 'https://openapi.tuyain.com', label: 'Indien' },
  { url: 'https://openapi.tuyacn.com', label: 'China' },
]

const settingsSchema = z.object({
  accessId: z.string().trim().min(10, 'Access ID prüfen').max(40),
  accessSecret: z.string().trim().min(10, 'Access Secret prüfen').max(64),
  apiUrl: z.enum(TUYA_DATACENTERS.map((d) => d.url)).default('https://openapi.tuyaeu.com'),
})

export function createTuyaAdapter({ settings } = {}) {
  const log = createLogger('tuya')

  // In der App gespeicherte Zugangsdaten haben Vorrang vor backend/.env
  function resolveCredentials() {
    const stored = settings?.get('tuya')
    return {
      accessId: stored?.accessId ?? config.tuya.accessId,
      accessSecret: stored?.accessSecret ?? config.tuya.accessSecret,
      apiUrl: stored?.apiUrl ?? config.tuya.apiUrl,
    }
  }

  let context = null
  let contextKey = ''
  function getContext() {
    const creds = resolveCredentials()
    if (!creds.accessId || !creds.accessSecret) return null
    const key = `${creds.accessId}|${creds.accessSecret}|${creds.apiUrl}`
    if (!context || key !== contextKey) {
      context = new TuyaContext({
        baseUrl: creds.apiUrl,
        accessKey: creds.accessId,
        secretKey: creds.accessSecret,
      })
      contextKey = key
    }
    return context
  }

  async function request(options) {
    const tuya = getContext()
    if (!tuya) {
      throw new IntegrationError('Tuya nicht konfiguriert — Zugangsdaten unter Integrationen eintragen')
    }
    const result = await withTimeout(
      tuya.request(options),
      REQUEST_TIMEOUT_MS,
      'Tuya-Cloud antwortet nicht (Zeitüberschreitung)',
    ).catch((err) => {
      if (err instanceof IntegrationError) throw err
      log.error('Tuya-Anfrage fehlgeschlagen', { path: options.path, error: String(err) })
      throw new IntegrationError('Tuya-Cloud nicht erreichbar')
    })
    if (!result.success) {
      log.warn('Tuya-Fehlerantwort', { path: options.path, code: result.code, msg: result.msg })
      throw new IntegrationError(
        KNOWN_ERRORS[result.code] ?? 'Tuya-Cloud hat den Aufruf abgelehnt',
        { code: result.code, msg: result.msg },
      )
    }
    return result.result
  }

  function mapDevice(d) {
    const state = Object.fromEntries((d.status ?? []).map((s) => [s.code, s.value]))
    const isCover = COVER_CATEGORIES.has(d.category)
    const hasPosition = 'percent_control' in state

    const capabilities = isCover
      ? [
          Capability.OPEN,
          Capability.CLOSE,
          Capability.STOP,
          ...(hasPosition ? [Capability.POSITION] : []),
        ]
      : []

    return {
      id: `tuya:${d.id}`,
      externalId: d.id,
      name: d.name?.trim() ?? d.id,
      room: null,
      type: isCover ? DeviceType.COVER : DeviceType.UNKNOWN,
      manufacturer: 'Tuya',
      integration: 'tuya',
      status: d.online ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE,
      lastSeen: null,
      capabilities,
      state: isCover ? { position: hasPosition ? state.percent_control : null } : {},
    }
  }

  const router = Router()

  // Zugangsdaten aus der App speichern (verschlüsselt in SQLite)
  router.post('/settings', validateBody(settingsSchema), (req, res) => {
    settings.set('tuya', req.body)
    res.json({ ok: true })
  })

  // Diagnose (Admin): rohe DP-Codes eines Geräts einsehen
  router.get('/devices/:id/functions', async (req, res) => {
    res.json(await request({ method: 'GET', path: `/v1.0/devices/${req.params.id}/functions` }))
  })

  return {
    name: 'tuya',
    label: 'Rollläden',
    manufacturer: 'Tuya',
    get configured() {
      return Boolean(getContext())
    },
    router,

    async getDevices() {
      const result = await request({
        method: 'GET',
        path: '/v1.0/iot-01/associated-users/devices',
        query: { size: 100 },
      })
      return (result.devices ?? []).map(mapDevice)
    },

    async executeCommand(externalId, command, params) {
      const buildCommand = COMMANDS[command]
      if (!buildCommand) {
        throw new IntegrationError(`Tuya unterstützt den Befehl „${command}" nicht`)
      }
      await request({
        method: 'POST',
        path: `/v1.0/devices/${externalId}/commands`,
        body: { commands: [buildCommand(params ?? {})] },
      })
    },

    async healthCheck() {
      if (!getContext()) return { status: 'not_configured' }
      try {
        await request({
          method: 'GET',
          path: '/v1.0/iot-01/associated-users/devices',
          query: { size: 1 },
        })
        return { status: 'connected' }
      } catch (err) {
        return { status: 'error', message: err.message }
      }
    },
  }
}
