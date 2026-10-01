import { EventEmitter } from 'node:events'
import { createLogger } from '../logger.js'

const log = createLogger('events')

// Zentraler Event-Bus: jedes Ereignis wird in SQLite persistiert (Timeline)
// und in-memory an Live-Zuhörer (SSE-Streams) verteilt. message ist der
// fertige deutsche Anzeigetext — das Frontend muss nichts übersetzen.
export function createEventBus(db) {
  const emitter = new EventEmitter()
  emitter.setMaxListeners(100)

  const insert = db.prepare(
    'INSERT INTO events (time, type, device_id, username, message, detail) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const selectPage = db.prepare(
    'SELECT * FROM events WHERE time < ? ORDER BY time DESC, id DESC LIMIT ?',
  )

  function rowToEvent(row) {
    return {
      id: row.id,
      time: row.time,
      type: row.type,
      deviceId: row.device_id,
      username: row.username,
      message: row.message,
      detail: row.detail ? JSON.parse(row.detail) : null,
    }
  }

  return {
    emit(type, { deviceId, username, message, detail } = {}) {
      const event = {
        time: Date.now(),
        type,
        deviceId: deviceId ?? null,
        username: username ?? null,
        message,
        detail: detail ?? null,
      }
      try {
        const { lastInsertRowid } = insert.run(
          event.time,
          event.type,
          event.deviceId,
          event.username,
          event.message,
          event.detail ? JSON.stringify(event.detail) : null,
        )
        event.id = Number(lastInsertRowid)
      } catch (err) {
        log.error('Event konnte nicht gespeichert werden', { type, error: String(err) })
      }
      emitter.emit('event', event)
      return event
    },

    list({ limit = 50, before } = {}) {
      return selectPage.all(before ?? Number.MAX_SAFE_INTEGER, limit).map(rowToEvent)
    },

    subscribe(listener) {
      emitter.on('event', listener)
      return () => emitter.off('event', listener)
    },
  }
}
