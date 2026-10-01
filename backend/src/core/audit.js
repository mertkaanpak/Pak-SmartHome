import { createLogger } from '../logger.js'

const log = createLogger('audit')

// Audit-Log für sicherheitsrelevante Aktionen (Logins, Gerätebefehle,
// Änderungen). detail wird als JSON gespeichert — niemals Passwörter
// oder Tokens hineingeben.
export function createAudit(db) {
  const insert = db.prepare(
    'INSERT INTO audit_logs (time, username, action, detail) VALUES (?, ?, ?, ?)',
  )
  return function audit(username, action, detail) {
    try {
      insert.run(Date.now(), username ?? null, action, detail ? JSON.stringify(detail) : null)
    } catch (err) {
      // Audit darf die eigentliche Aktion nie blockieren
      log.error('Audit-Eintrag fehlgeschlagen', { action, error: String(err) })
    }
  }
}
