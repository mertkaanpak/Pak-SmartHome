import { HttpError } from '../errors.js'
import { createLogger } from '../logger.js'
import { CommandCapability } from './capabilities.js'

const CACHE_TTL_MS = 5_000

// Zentrale Service-Schicht über allen Integrationsadaptern:
// aggregiert Geräte zum einheitlichen Modell, mischt Benutzer-Metadaten
// (Raum, Favorit, eigener Name) aus der Datenbank dazu und leitet Befehle
// an den zuständigen Adapter weiter. Fällt eine Integration aus, bleiben
// die übrigen nutzbar (Fehler werden pro Integration gemeldet).
export function createDeviceService({ db, adapters, events }) {
  const log = createLogger('devices')
  const adaptersByName = new Map(adapters.map((a) => [a.name, a]))
  let cache = { at: 0, result: null }
  // Letzter bekannter Status pro Gerät — für Online/Offline-Ereignisse
  let lastStatusById = null

  const selectAllMeta = db.prepare('SELECT * FROM device_meta')
  const selectMeta = db.prepare('SELECT * FROM device_meta WHERE id = ?')
  const upsertMeta = db.prepare(`
    INSERT INTO device_meta (id, integration, external_id, name_override, room, favorite)
    VALUES (@id, @integration, @externalId, @nameOverride, @room, @favorite)
    ON CONFLICT (id) DO UPDATE SET
      name_override = excluded.name_override,
      room = excluded.room,
      favorite = excluded.favorite
  `)

  function applyMeta(device, metaById) {
    const meta = metaById.get(device.id)
    if (!meta) return { ...device, favorite: false }
    return {
      ...device,
      name: meta.name_override ?? device.name,
      room: meta.room ?? device.room,
      favorite: meta.favorite === 1,
    }
  }

  async function listDevices({ fresh = false } = {}) {
    if (!fresh && cache.result && Date.now() - cache.at < CACHE_TTL_MS) {
      return cache.result
    }

    const metaById = new Map(selectAllMeta.all().map((m) => [m.id, m]))
    const devices = []
    const errors = []

    for (const adapter of adapters) {
      if (!adapter.configured) continue
      try {
        const list = await adapter.getDevices()
        devices.push(...list.map((d) => applyMeta(d, metaById)))
      } catch (err) {
        log.error('Integration lieferte keine Geräte', {
          integration: adapter.name,
          error: err.message,
        })
        errors.push({ integration: adapter.name, label: adapter.label, error: err.message })
      }
    }

    // Statuswechsel erkennen und als Ereignis melden (nicht beim ersten
    // Laden nach dem Start — da gibt es noch keinen Vergleichswert).
    if (events && lastStatusById) {
      for (const device of devices) {
        const previous = lastStatusById.get(device.id)
        if (!previous || previous === device.status) continue
        if (device.status === 'OFFLINE') {
          events.emit('device.offline', {
            deviceId: device.id,
            message: `„${device.name}" ist nicht mehr erreichbar`,
          })
        } else if (device.status === 'ONLINE' && previous === 'OFFLINE') {
          events.emit('device.online', {
            deviceId: device.id,
            message: `„${device.name}" ist wieder online`,
          })
        }
      }
    }
    lastStatusById = new Map(devices.map((d) => [d.id, d.status]))

    const result = { devices, errors }
    cache = { at: Date.now(), result }
    return result
  }

  async function getDevice(id, options) {
    const { devices } = await listDevices(options)
    const device = devices.find((d) => d.id === id)
    if (!device) throw new HttpError(404, 'Gerät nicht gefunden')
    return device
  }

  async function executeCommand(id, command, params) {
    const requiredCapability = CommandCapability[command]
    if (!requiredCapability) {
      throw new HttpError(400, `Unbekannter Befehl: ${command}`)
    }

    const device = await getDevice(id)
    if (!device.capabilities.includes(requiredCapability)) {
      throw new HttpError(400, `„${device.name}" unterstützt diesen Befehl nicht`)
    }

    const adapter = adaptersByName.get(device.integration)
    await adapter.executeCommand(device.externalId, command, params)
    log.info('Befehl ausgeführt', { device: id, command, params })
    cache = { at: 0, result: null }
    return device
  }

  // Nur die im Patch enthaltenen Felder ändern; alles andere bleibt bestehen.
  async function updateMeta(id, patch) {
    const device = await getDevice(id)
    const existing = selectMeta.get(id) ?? {}
    upsertMeta.run({
      id: device.id,
      integration: device.integration,
      externalId: device.externalId,
      nameOverride:
        patch.name !== undefined ? patch.name : (existing.name_override ?? null),
      room: patch.room !== undefined ? patch.room : (existing.room ?? null),
      favorite:
        patch.favorite !== undefined ? Number(patch.favorite) : (existing.favorite ?? 0),
    })
    cache = { at: 0, result: null }
    return getDevice(id)
  }

  return { listDevices, getDevice, executeCommand, updateMeta }
}
