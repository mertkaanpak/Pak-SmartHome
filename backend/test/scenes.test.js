import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { createDeviceService } from '../src/core/deviceService.js'
import { createEventBus } from '../src/core/events.js'
import { createSceneService } from '../src/core/sceneService.js'

function cover(id, name) {
  return {
    id: `fake:${id}`,
    externalId: id,
    name,
    room: null,
    type: 'cover',
    manufacturer: 'Test',
    integration: 'fake',
    status: 'ONLINE',
    lastSeen: null,
    capabilities: ['open', 'close', 'stop', 'position'],
    state: {},
  }
}

function setup({ failFor = [] } = {}) {
  const db = openDb(':memory:')
  const adapter = {
    name: 'fake',
    label: 'Fake',
    manufacturer: 'Test',
    configured: true,
    async getDevices() {
      return [cover('a', 'Wohnzimmer links'), cover('b', 'Wohnzimmer rechts')]
    },
    async executeCommand(externalId) {
      if (failFor.includes(externalId)) throw new Error('Gerät antwortet nicht')
    },
    async healthCheck() {
      return { status: 'connected' }
    },
  }
  const events = createEventBus(db)
  const deviceService = createDeviceService({ db, adapters: [adapter], events })
  const scenes = createSceneService({ db, deviceService, events, audit: () => {} })
  return { scenes, events }
}

const DEMO_ACTIONS = [
  { deviceId: 'fake:a', command: 'close' },
  { deviceId: 'fake:b', command: 'close' },
]

test('Szene anlegen, ändern, löschen', async () => {
  const { scenes } = setup()
  const created = scenes.create({ name: 'Gute Nacht', icon: 'moon', actions: DEMO_ACTIONS })
  assert.equal(created.actions.length, 2)
  const updated = scenes.update(created.id, { name: 'Nachtmodus' })
  assert.equal(updated.name, 'Nachtmodus')
  assert.equal(updated.actions.length, 2)
  scenes.remove(created.id)
  assert.equal(scenes.list().length, 0)
})

test('Szene ausführen: voller Erfolg erzeugt Event', async () => {
  const { scenes, events } = setup()
  const scene = scenes.create({ name: 'Gute Nacht', actions: DEMO_ACTIONS })
  const result = await scenes.execute(scene.id, 'mert')
  assert.equal(result.ok, 2)
  assert.equal(result.total, 2)
  const timeline = events.list()
  assert.ok(timeline.some((e) => e.type === 'scene.executed' && e.message.includes('2 von 2')))
})

test('Szene ausführen: Teilerfolg statt Komplettabbruch', async () => {
  const { scenes } = setup({ failFor: ['b'] })
  const scene = scenes.create({ name: 'Gute Nacht', actions: DEMO_ACTIONS })
  const result = await scenes.execute(scene.id, 'mert')
  assert.equal(result.ok, 1)
  assert.equal(result.total, 2)
  const failed = result.results.find((r) => !r.ok)
  assert.equal(failed.deviceId, 'fake:b')
  assert.ok(failed.error)
})

test('Event-Bus persistiert und benachrichtigt Live-Zuhörer', async () => {
  const { events } = setup()
  const received = []
  const unsubscribe = events.subscribe((e) => received.push(e))
  events.emit('device.command', { message: 'Testereignis' })
  unsubscribe()
  events.emit('device.command', { message: 'Nach Abmeldung' })
  assert.equal(received.length, 1)
  assert.equal(events.list().length, 2)
  assert.equal(events.list({ limit: 1 })[0].message, 'Nach Abmeldung')
})
