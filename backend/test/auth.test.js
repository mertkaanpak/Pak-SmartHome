import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { createAuthService } from '../src/core/auth.js'

function createService() {
  const db = openDb(':memory:')
  const auditEntries = []
  const audit = (username, action, detail) => auditEntries.push({ username, action, detail })
  return { auth: createAuthService(db, audit), auditEntries }
}

test('Ersteinrichtung legt Admin an und liefert Session', async () => {
  const { auth } = createService()
  assert.equal(auth.needsSetup(), true)
  const { token, user } = await auth.setup('mert', 'sehr-geheim-123')
  assert.equal(user.role, 'admin')
  assert.equal(auth.needsSetup(), false)
  assert.deepEqual(auth.verifySession(token), { username: 'mert', role: 'admin' })
})

test('Zweite Ersteinrichtung wird abgelehnt', async () => {
  const { auth } = createService()
  await auth.setup('mert', 'sehr-geheim-123')
  await assert.rejects(
    () => auth.setup('angreifer', 'boeses-passwort'),
    (err) => err.status === 409,
  )
})

test('Login mit korrektem und falschem Passwort', async () => {
  const { auth, auditEntries } = createService()
  await auth.setup('mert', 'sehr-geheim-123')
  const { token } = await auth.login('mert', 'sehr-geheim-123')
  assert.ok(auth.verifySession(token))
  await assert.rejects(
    () => auth.login('mert', 'falsches-passwort'),
    (err) => err.status === 401,
  )
  assert.ok(auditEntries.some((e) => e.action === 'auth.login_failed'))
})

test('Unbekannter Benutzer liefert dieselbe 401-Meldung', async () => {
  const { auth } = createService()
  await auth.setup('mert', 'sehr-geheim-123')
  await assert.rejects(
    () => auth.login('gibtsnicht', 'sehr-geheim-123'),
    (err) => err.status === 401 && err.message.includes('falsch'),
  )
})

test('Logout macht die Session ungültig', async () => {
  const { auth } = createService()
  const { token } = await auth.setup('mert', 'sehr-geheim-123')
  auth.logout(token)
  assert.equal(auth.verifySession(token), null)
})

test('Ungültige oder fehlende Tokens ergeben null', async () => {
  const { auth } = createService()
  await auth.setup('mert', 'sehr-geheim-123')
  assert.equal(auth.verifySession('voellig-falsch'), null)
  assert.equal(auth.verifySession(undefined), null)
})
