import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { createDeviceService } from '../src/core/deviceService.js'

function fakeAdapter(overrides = {}) {
  const commands = []
  return {
    name: 'fake',
    label: 'Fake',
    manufacturer: 'Test',
    configured: true,
    commands,
    async getDevices() {
      return [
        {
          id: 'fake:dev1',
          externalId: 'dev1',
          name: 'Testrollladen',
          room: null,
          type: 'cover',
          manufacturer: 'Test',
          integration: 'fake',
          status: 'ONLINE',
          lastSeen: null,
          capabilities: ['open', 'close', 'stop'],
          state: {},
        },
      ]
    },
    async executeCommand(externalId, command, params) {
      commands.push({ externalId, command, params })
    },
    async healthCheck() {
      return { status: 'connected' }
    },
    ...overrides,
  }
}

function createService(adapters) {
  return createDeviceService({ db: openDb(':memory:'), adapters })
}

test('listDevices liefert Geräte des Adapters', async () => {
  const service = createService([fakeAdapter()])
  const { devices, errors } = await service.listDevices()
  assert.equal(errors.length, 0)
  assert.equal(devices.length, 1)
  assert.equal(devices[0].id, 'fake:dev1')
  assert.equal(devices[0].favorite, false)
})

test('updateMeta setzt Raum/Favorit und merged Folge-Patches', async () => {
  const service = createService([fakeAdapter()])
  await service.updateMeta('fake:dev1', { room: 'Wohnzimmer', favorite: true })
  const patched = await service.updateMeta('fake:dev1', { name: 'Links' })
  assert.equal(patched.room, 'Wohnzimmer')
  assert.equal(patched.favorite, true)
  assert.equal(patched.name, 'Links')
})

test('executeCommand leitet an den Adapter weiter', async () => {
  const adapter = fakeAdapter()
  const service = createService([adapter])
  await service.executeCommand('fake:dev1', 'open')
  assert.deepEqual(adapter.commands, [{ externalId: 'dev1', command: 'open', params: undefined }])
})

test('executeCommand lehnt nicht unterstützte Befehle ab', async () => {
  const service = createService([fakeAdapter()])
  await assert.rejects(
    () => service.executeCommand('fake:dev1', 'setPosition', { percent: 50 }),
    (err) => err.status === 400,
  )
})

test('Ausfall einer Integration blockiert die übrigen nicht', async () => {
  const broken = fakeAdapter({
    name: 'broken',
    async getDevices() {
      throw new Error('Cloud weg')
    },
  })
  const service = createService([broken, fakeAdapter()])
  const { devices, errors } = await service.listDevices()
  assert.equal(devices.length, 1)
  assert.equal(errors.length, 1)
  assert.equal(errors[0].integration, 'broken')
})
