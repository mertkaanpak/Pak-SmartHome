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
  {
    version: 2,
    name: 'Auth: Rollen, Sessions, Audit-Log',
    up(db) {
      db.exec(`
        ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin';

        CREATE TABLE sessions (
          token_hash TEXT PRIMARY KEY,              -- SHA-256 des Session-Tokens
          user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX idx_sessions_user ON sessions(user_id);

        CREATE TABLE audit_logs (
          id       INTEGER PRIMARY KEY AUTOINCREMENT,
          time     INTEGER NOT NULL,
          username TEXT,
          action   TEXT NOT NULL,                   -- z. B. auth.login, device.command
          detail   TEXT                             -- JSON, niemals Secrets
        );
        CREATE INDEX idx_audit_time ON audit_logs(time);
      `)
    },
  },
  {
    version: 3,
    name: 'Events und Szenen',
    up(db) {
      db.exec(`
        CREATE TABLE events (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          time      INTEGER NOT NULL,
          type      TEXT NOT NULL,                  -- device.command, device.offline, scene.executed, user.login, …
          device_id TEXT,
          username  TEXT,
          message   TEXT NOT NULL,                  -- fertiger deutscher Anzeigetext
          detail    TEXT                            -- JSON, niemals Secrets
        );
        CREATE INDEX idx_events_time ON events(time);

        CREATE TABLE scenes (
          id   INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT NOT NULL DEFAULT 'scene',
          sort INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE scene_actions (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          scene_id  INTEGER NOT NULL REFERENCES scenes(id) ON DELETE CASCADE,
          device_id TEXT NOT NULL,
          command   TEXT NOT NULL,
          params    TEXT,                           -- JSON, z. B. {"percent":50}
          sort      INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX idx_scene_actions_scene ON scene_actions(scene_id);
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
