import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { createEventBus } from '../src/core/events.js'
import { createAutomationService } from '../src/core/automationService.js'
import { sunTimes } from '../src/core/sun.js'

const LOCATION = { lat: 51.5, lon: 6.89 }

function createService({ now } = {}) {
  const db = openDb(':memory:')
  const events = createEventBus(db)
  const executed = []
  const scenes = {
    async execute(id) {
      executed.push(id)
      return { scene: { id, name: 'Testszene' }, results: [], ok: 1, total: 1 }
    },
  }
  // Szene anlegen, damit der Fremdschlüssel existiert
  db.prepare("INSERT INTO scenes (name, icon) VALUES ('Testszene', 'scene')").run()
  const automations = createAutomationService({
    db,
    scenes,
    events,
    audit: () => {},
    location: LOCATION,
    now: now ?? (() => new Date()),
  })
  return { automations, executed, events }
}

test('Sonnenzeiten sind plausibel (Oktober, Ruhrgebiet)', () => {
  const times = sunTimes(new Date(2026, 9, 1, 12, 0), LOCATION.lat, LOCATION.lon)
  const sunriseHour = times.sunrise.getHours() + times.sunrise.getMinutes() / 60
  const sunsetHour = times.sunset.getHours() + times.sunset.getMinutes() / 60
  assert.ok(sunriseHour > 5.5 && sunriseHour < 9, `Sonnenaufgang ${sunriseHour}`)
  assert.ok(sunsetHour > 17.5 && sunsetHour < 20.5, `Sonnenuntergang ${sunsetHour}`)
  assert.ok(times.sunset > times.sunrise)
})

test('Zeit-Trigger feuert zur richtigen Minute, und nur einmal', async () => {
  // Do, 1. Okt 2026, 07:30 — Wochentag 3 (0 = Montag)
  const fireDate = new Date(2026, 9, 1, 7, 30, 5)
  const { automations, executed } = createService({ now: () => fireDate })
  automations.create({
    name: 'Morgens öffnen',
    trigger: { type: 'time', time: '07:30' },
    weekdays: [0, 1, 2, 3, 4],
    sceneId: 1,
  })
  await automations.tick(new Date(2026, 9, 1, 7, 29, 0))
  assert.equal(executed.length, 0)
  await automations.tick(fireDate)
  await automations.tick(new Date(2026, 9, 1, 7, 30, 40)) // selbe Minute
  assert.equal(executed.length, 1)
})

test('Wochentags-Filter greift', async () => {
  const { automations, executed } = createService()
  automations.create({
    name: 'Nur Montag',
    trigger: { type: 'time', time: '07:30' },
    weekdays: [0],
    sceneId: 1,
  })
  // Do, 1. Okt 2026 ist kein Montag
  await automations.tick(new Date(2026, 9, 1, 7, 30, 0))
  assert.equal(executed.length, 0)
})

test('Deaktivierte Automation feuert nicht', async () => {
  const { automations, executed } = createService()
  const created = automations.create({
    name: 'Aus',
    enabled: false,
    trigger: { type: 'time', time: '07:30' },
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    sceneId: 1,
  })
  assert.equal(created.nextRun, null)
  await automations.tick(new Date(2026, 9, 1, 7, 30, 0))
  assert.equal(executed.length, 0)
})

test('nextRun liegt in der Zukunft und am erlaubten Wochentag', () => {
  const { automations } = createService({ now: () => new Date(2026, 9, 1, 12, 0, 0) })
  const created = automations.create({
    name: 'Abends',
    trigger: { type: 'time', time: '07:30' },
    weekdays: [0], // nur Montag
    sceneId: 1,
  })
  const next = new Date(created.nextRun)
  assert.ok(next > new Date(2026, 9, 1, 12, 0, 0))
  assert.equal(next.getDay(), 1) // JS: 1 = Montag
  assert.equal(next.getHours(), 7)
  assert.equal(next.getMinutes(), 30)
})

test('Sonnen-Trigger mit Offset feuert zur berechneten Minute', async () => {
  const day = new Date(2026, 9, 1, 12, 0)
  const sunset = sunTimes(day, LOCATION.lat, LOCATION.lon).sunset
  const target = new Date(sunset.getTime() + 15 * 60_000)
  target.setSeconds(10, 0)
  const { automations, executed } = createService({ now: () => target })
  automations.create({
    name: 'Abends schließen',
    trigger: { type: 'sun', event: 'sunset', offsetMinutes: 15 },
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    sceneId: 1,
  })
  await automations.tick(target)
  assert.equal(executed.length, 1)
})

test('Manueller Lauf erzeugt Automation-Ereignis', async () => {
  const { automations, events } = createService()
  const created = automations.create({
    name: 'Testlauf',
    trigger: { type: 'time', time: '07:30' },
    weekdays: [0],
    sceneId: 1,
  })
  const result = await automations.runNow(created.id, 'mert')
  assert.equal(result.ok, 1)
  assert.ok(events.list().some((e) => e.type === 'automation.executed'))
})
