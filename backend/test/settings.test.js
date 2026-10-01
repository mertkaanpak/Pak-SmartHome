import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDb } from '../src/db.js'
import { createSecrets } from '../src/core/secrets.js'
import { createSettingsService } from '../src/core/settingsService.js'
import { createTuyaAdapter } from '../src/integrations/tuya/index.js'

const keyFile = () => join(mkdtempSync(join(tmpdir(), 'pak-test-')), 'secret.key')

test('Secrets: verschlüsseln und entschlüsseln (Umlaute inklusive)', () => {
  const secrets = createSecrets(keyFile())
  const text = 'Tür-Token äöü 123'
  const blob = secrets.encrypt(text)
  assert.notEqual(blob, text)
  assert.ok(!blob.includes('Token'))
  assert.equal(secrets.decrypt(blob), text)
})

test('Secrets: Schlüssel bleibt über Instanzen stabil', () => {
  const file = keyFile()
  const blob = createSecrets(file).encrypt('geheim')
  assert.equal(createSecrets(file).decrypt(blob), 'geheim')
})

test('Settings: Roundtrip über die Datenbank, verschlüsselt gespeichert', () => {
  const db = openDb(':memory:')
  const settings = createSettingsService(db, createSecrets(keyFile()))
  settings.set('ring', { refreshToken: 'sehr-geheimes-token' })
  assert.deepEqual(settings.get('ring'), { refreshToken: 'sehr-geheimes-token' })
  const raw = db.prepare("SELECT data FROM integration_settings WHERE integration='ring'").get()
  assert.ok(!raw.data.includes('sehr-geheimes-token'))
  settings.remove('ring')
  assert.equal(settings.get('ring'), null)
})

test('Tuya-Adapter: App-Einstellungen haben Vorrang, configured reagiert live', () => {
  const store = new Map()
  const settings = {
    get: (k) => store.get(k) ?? null,
    set: (k, v) => store.set(k, v),
    remove: (k) => store.delete(k),
  }
  const adapter = createTuyaAdapter({ settings })

  // Leere Zugangsdaten aus der App überdecken die .env-Werte
  settings.set('tuya', { accessId: '', accessSecret: '', apiUrl: 'https://openapi.tuyaeu.com' })
  assert.equal(adapter.configured, false)

  settings.set('tuya', {
    accessId: 'test-access-id-123',
    accessSecret: 'test-access-secret-456',
    apiUrl: 'https://openapi.tuyaeu.com',
  })
  assert.equal(adapter.configured, true)
})
