import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from './config.js'

export function openDb() {
  mkdirSync(dirname(config.dbFile), { recursive: true })
  const db = new Database(config.dbFile)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      module      TEXT NOT NULL,
      external_id TEXT NOT NULL,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL,
      config      TEXT NOT NULL DEFAULT '{}',
      UNIQUE (module, external_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );
  `)

  return db
}
