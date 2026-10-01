import { createLogger } from '../logger.js'

const log = createLogger('settings')

// In der App hinterlegte Integrations-Einstellungen (z. B. Tuya-Keys,
// Ring-Refresh-Token). Werte liegen verschlüsselt in SQLite; .env bleibt
// als Fallback bestehen — DB-Werte haben Vorrang.
export function createSettingsService(db, secrets) {
  const select = db.prepare('SELECT data FROM integration_settings WHERE integration = ?')
  const upsert = db.prepare(`
    INSERT INTO integration_settings (integration, data, updated_at) VALUES (?, ?, ?)
    ON CONFLICT (integration) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
  `)
  const del = db.prepare('DELETE FROM integration_settings WHERE integration = ?')

  return {
    get(integration) {
      const row = select.get(integration)
      if (!row) return null
      try {
        return JSON.parse(secrets.decrypt(row.data))
      } catch (err) {
        log.error('Einstellungen nicht lesbar (Schlüssel geändert?)', {
          integration,
          error: String(err),
        })
        return null
      }
    },

    set(integration, value) {
      upsert.run(integration, secrets.encrypt(JSON.stringify(value)), Date.now())
    },

    remove(integration) {
      del.run(integration)
    },
  }
}
