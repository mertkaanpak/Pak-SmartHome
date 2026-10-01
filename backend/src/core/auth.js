import { createHash, randomBytes } from 'node:crypto'
import { Algorithm, hash as argonHash, verify as argonVerify } from '@node-rs/argon2'
import { HttpError } from '../errors.js'

export const SESSION_COOKIE = 'pak_session'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 Tage, gleitend verlängert
const RENEW_BELOW_MS = 15 * 24 * 60 * 60 * 1000

// Argon2id mit den OWASP-empfohlenen Parametern (Bibliotheks-Default:
// m=19456 KiB, t=2, p=1). Passwörter werden nie im Klartext gespeichert.
const ARGON_OPTIONS = { algorithm: Algorithm.Argon2id }

// Dummy-Hash: Bei unbekanntem Benutzer wird trotzdem eine Verifikation
// durchgeführt, damit die Antwortzeit keinen Rückschluss zulässt, ob der
// Benutzername existiert.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$Ka8W7uAZtlQNxg0JVtvAd2bMGlKvFQJq6mzAInBzSBE'

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export function createAuthService(db, audit) {
  const countUsers = db.prepare('SELECT COUNT(*) AS n FROM users')
  const selectUser = db.prepare('SELECT * FROM users WHERE username = ?')
  const insertUser = db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
  )
  const insertSession = db.prepare(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  )
  const selectSession = db.prepare(`
    SELECT s.token_hash, s.expires_at, u.id AS user_id, u.username, u.role
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `)
  const renewSession = db.prepare('UPDATE sessions SET expires_at = ? WHERE token_hash = ?')
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?')
  const deleteExpired = db.prepare('DELETE FROM sessions WHERE expires_at < ?')

  function createSession(userId) {
    const token = randomBytes(32).toString('base64url')
    insertSession.run(hashToken(token), userId, Date.now(), Date.now() + SESSION_TTL_MS)
    deleteExpired.run(Date.now())
    return token
  }

  return {
    needsSetup() {
      return countUsers.get().n === 0
    },

    // Ersteinrichtung: nur erlaubt, solange noch kein Benutzer existiert.
    async setup(username, password) {
      if (!this.needsSetup()) {
        throw new HttpError(409, 'Die Ersteinrichtung wurde bereits abgeschlossen')
      }
      const passwordHash = await argonHash(password, ARGON_OPTIONS)
      const { lastInsertRowid } = insertUser.run(username, passwordHash, 'admin')
      audit(username, 'user.created', { role: 'admin', firstRun: true })
      const token = createSession(lastInsertRowid)
      return { token, user: { username, role: 'admin' } }
    },

    async login(username, password) {
      const user = selectUser.get(username)
      const valid = await argonVerify(user?.password_hash ?? DUMMY_HASH, password)
      if (!user || !valid) {
        audit(username, 'auth.login_failed')
        throw new HttpError(401, 'Benutzername oder Passwort ist falsch')
      }
      audit(username, 'auth.login')
      const token = createSession(user.id)
      return { token, user: { username: user.username, role: user.role } }
    },

    // Synchron (nur Hash-Lookup) — läuft bei jeder Anfrage.
    verifySession(token) {
      if (!token) return null
      const row = selectSession.get(hashToken(token))
      if (!row) return null
      if (row.expires_at < Date.now()) {
        deleteSession.run(row.token_hash)
        return null
      }
      if (row.expires_at - Date.now() < SESSION_TTL_MS - RENEW_BELOW_MS) {
        renewSession.run(Date.now() + SESSION_TTL_MS, row.token_hash)
      }
      return { username: row.username, role: row.role }
    },

    logout(token) {
      if (!token) return
      const row = selectSession.get(hashToken(token))
      deleteSession.run(hashToken(token))
      if (row) audit(row.username, 'auth.logout')
    },
  }
}

// Cookie-Eigenschaften zentral: HttpOnly gegen XSS-Diebstahl, SameSite=Lax
// gegen CSRF bei Navigationen, Secure sobald produktiv hinter HTTPS.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_MS,
    path: '/',
  }
}
