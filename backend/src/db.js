import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from './config.js'
import { createLogger } from './logger.js'

const log = createLogger('db')

// Reproduzierbare Schemaänderungen: jede Migration läuft genau einmal,
// der Stand wird in PRAGMA user_version festgehalten. Neue Änderungen
// bekommen die nächste Versionsnummer — bestehende Migrationen nie ändern.
const migrations = [
  {
    version: 1,
    name: 'Geräte-Metadaten und Benutzer',
    up(db) {
      db.exec(`
        DROP TABLE IF EXISTS devices; -- ungenutzter Entwurf aus der Anfangsphase

        CREATE TABLE IF NOT EXISTS users (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          username      TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS device_meta (
          id            TEXT PRIMARY KEY,           -- "<integration>:<externalId>"
          integration   TEXT NOT NULL,
          external_id   TEXT NOT NULL,
          name_override TEXT,
          room          TEXT,
          favorite      INTEGER NOT NULL DEFAULT 0,
          enabled       INTEGER NOT NULL DEFAULT 1
        );
      `)
    },
  },
]

export function openDb(file = config.dbFile) {
  if (file !== ':memory:') {
    mkdirSync(dirname(file), { recursive: true })
  }
  const db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const current = db.pragma('user_version', { simple: true })
  for (const migration of migrations) {
    if (migration.version <= current) continue
    db.transaction(() => {
      migration.up(db)
      db.pragma(`user_version = ${migration.version}`)
    })()
    log.info('Migration ausgeführt', { version: migration.version, name: migration.name })
  }

  return db
}
