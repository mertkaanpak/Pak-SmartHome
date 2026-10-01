import { HttpError } from '../errors.js'
import { createLogger } from '../logger.js'
import { sunTimes } from './sun.js'

const TICK_MS = 20_000

const pad = (n) => String(n).padStart(2, '0')
const hhmm = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`
const minuteKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hhmm(date)}`
// Wochentag mit 0 = Montag … 6 = Sonntag (deutsche Konvention)
const weekdayOf = (date) => (date.getDay() + 6) % 7

// Automationen: TRIGGER (Uhrzeit oder Sonnenauf-/-untergang ± Offset,
// eingeschränkt auf Wochentage) -> AKTION (eine Szene ausführen).
// Der Scheduler prüft minütlich; jede Automation feuert pro Minute
// höchstens einmal. Angelegt und verwaltet wird alles vom Benutzer
// in der App — hier gibt es keine fest verdrahteten Abläufe.
export function createAutomationService({ db, scenes, events, audit, location, now = () => new Date() }) {
  const log = createLogger('automations')

  const selectAll = db.prepare('SELECT * FROM automations ORDER BY id')
  const selectOne = db.prepare('SELECT * FROM automations WHERE id = ?')
  const insert = db.prepare(`
    INSERT INTO automations (name, enabled, trigger_type, trigger_config, weekdays, scene_id)
    VALUES (@name, @enabled, @triggerType, @triggerConfig, @weekdays, @sceneId)
  `)
  const update = db.prepare(`
    UPDATE automations SET name = @name, enabled = @enabled, trigger_type = @triggerType,
      trigger_config = @triggerConfig, weekdays = @weekdays, scene_id = @sceneId
    WHERE id = @id
  `)
  const remove = db.prepare('DELETE FROM automations WHERE id = ?')
  const touchLastRun = db.prepare('UPDATE automations SET last_run = ? WHERE id = ?')

  const lastFired = new Map() // id -> minuteKey
  let timer = null

  function toAutomation(row) {
    const automation = {
      id: row.id,
      name: row.name,
      enabled: row.enabled === 1,
      trigger: { type: row.trigger_type, ...JSON.parse(row.trigger_config) },
      weekdays: JSON.parse(row.weekdays),
      sceneId: row.scene_id,
      lastRun: row.last_run,
    }
    automation.nextRun = computeNextRun(automation)
    return automation
  }

  // Ziel-Uhrzeit (HH:MM) der Automation an einem bestimmten Tag
  function triggerTimeFor(automation, date) {
    if (automation.trigger.type === 'time') return automation.trigger.time
    if (!location) return null
    const times = sunTimes(date, location.lat, location.lon)
    if (!times) return null
    const base = automation.trigger.event === 'sunrise' ? times.sunrise : times.sunset
    return hhmm(new Date(base.getTime() + (automation.trigger.offsetMinutes ?? 0) * 60_000))
  }

  function computeNextRun(automation) {
    if (!automation.enabled || !automation.sceneId) return null
    const start = now()
    for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
      const day = new Date(start)
      day.setDate(start.getDate() + dayOffset)
      if (!automation.weekdays.includes(weekdayOf(day))) continue
      const time = triggerTimeFor(automation, day)
      if (!time) continue
      const [h, m] = time.split(':').map(Number)
      const candidate = new Date(day)
      candidate.setHours(h, m, 0, 0)
      if (candidate > start) return candidate.getTime()
    }
    return null
  }

  function getAutomation(id) {
    const row = selectOne.get(id)
    if (!row) throw new HttpError(404, 'Automation nicht gefunden')
    return toAutomation(row)
  }

  function toRow(data) {
    const { type, ...config } = data.trigger
    return {
      name: data.name,
      enabled: data.enabled === false ? 0 : 1,
      triggerType: type,
      triggerConfig: JSON.stringify(config),
      weekdays: JSON.stringify([...data.weekdays].sort()),
      sceneId: data.sceneId,
    }
  }

  async function run(automation, source) {
    touchLastRun.run(Date.now(), automation.id)
    const result = await scenes.execute(automation.sceneId, null, { emitEvent: false })
    events?.emit('automation.executed', {
      message: `Automation „${automation.name}" ausgeführt — Szene „${result.scene.name}": ${result.ok} von ${result.total} Aktionen erfolgreich`,
      detail: { automation: automation.name, ok: result.ok, total: result.total, source },
    })
    audit?.(null, 'automation.executed', {
      automation: automation.name,
      ok: result.ok,
      total: result.total,
      source,
    })
    return result
  }

  async function tick(date = now()) {
    const key = minuteKey(date)
    const current = hhmm(date)
    for (const row of selectAll.all()) {
      const automation = toAutomation(row)
      if (!automation.enabled || !automation.sceneId) continue
      if (!automation.weekdays.includes(weekdayOf(date))) continue
      if (triggerTimeFor(automation, date) !== current) continue
      if (lastFired.get(automation.id) === key) continue
      lastFired.set(automation.id, key)
      try {
        await run(automation, 'scheduler')
        log.info('Automation ausgeführt', { automation: automation.name })
      } catch (err) {
        log.error('Automation fehlgeschlagen', {
          automation: automation.name,
          error: err.message,
        })
        events?.emit('automation.failed', {
          message: `Automation „${automation.name}" konnte nicht ausgeführt werden`,
          detail: { error: err.message },
        })
      }
    }
  }

  return {
    list() {
      return selectAll.all().map(toAutomation)
    },

    create(data, username) {
      const { lastInsertRowid } = insert.run(toRow(data))
      audit?.(username, 'automation.created', { automation: data.name })
      return getAutomation(lastInsertRowid)
    },

    update(id, patch, username) {
      const existing = getAutomation(id)
      const merged = { ...existing, ...patch, trigger: patch.trigger ?? existing.trigger }
      update.run({ id, ...toRow(merged) })
      audit?.(username, 'automation.updated', { automation: merged.name })
      return getAutomation(id)
    },

    remove(id, username) {
      const existing = getAutomation(id)
      remove.run(id)
      audit?.(username, 'automation.deleted', { automation: existing.name })
    },

    // Manueller Testlauf aus der App ("Jetzt ausführen")
    async runNow(id, username) {
      const automation = getAutomation(id)
      if (!automation.sceneId) throw new HttpError(400, 'Keine Szene zugeordnet')
      audit?.(username, 'automation.run_manual', { automation: automation.name })
      return run(automation, 'manual')
    },

    tick, // für Tests

    start() {
      timer = setInterval(() => tick().catch((err) => log.error(String(err))), TICK_MS)
      timer.unref?.()
      log.info('Automations-Scheduler gestartet')
    },

    stop() {
      clearInterval(timer)
    },
  }
}
