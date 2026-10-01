import { HttpError } from '../errors.js'
import { createLogger } from '../logger.js'

// Szenen: benannte Abläufe aus mehreren Geräteaktionen. Aktionen laufen
// nacheinander; Fehler einzelner Geräte brechen die Szene nicht ab,
// sondern erscheinen im Ergebnis (§ Teilerfolg).
export function createSceneService({ db, deviceService, events, audit }) {
  const log = createLogger('scenes')

  const selectScenes = db.prepare('SELECT * FROM scenes ORDER BY sort, id')
  const selectScene = db.prepare('SELECT * FROM scenes WHERE id = ?')
  const selectActions = db.prepare(
    'SELECT * FROM scene_actions WHERE scene_id = ? ORDER BY sort, id',
  )
  const insertScene = db.prepare('INSERT INTO scenes (name, icon) VALUES (?, ?)')
  const updateScene = db.prepare('UPDATE scenes SET name = ?, icon = ? WHERE id = ?')
  const deleteScene = db.prepare('DELETE FROM scenes WHERE id = ?')
  const insertAction = db.prepare(
    'INSERT INTO scene_actions (scene_id, device_id, command, params, sort) VALUES (?, ?, ?, ?, ?)',
  )
  const deleteActions = db.prepare('DELETE FROM scene_actions WHERE scene_id = ?')

  function toScene(row) {
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      actions: selectActions.all(row.id).map((a) => ({
        deviceId: a.device_id,
        command: a.command,
        params: a.params ? JSON.parse(a.params) : undefined,
      })),
    }
  }

  const writeActions = db.transaction((sceneId, actions) => {
    deleteActions.run(sceneId)
    actions.forEach((action, index) => {
      insertAction.run(
        sceneId,
        action.deviceId,
        action.command,
        action.params ? JSON.stringify(action.params) : null,
        index,
      )
    })
  })

  function getScene(id) {
    const row = selectScene.get(id)
    if (!row) throw new HttpError(404, 'Szene nicht gefunden')
    return toScene(row)
  }

  return {
    list() {
      return selectScenes.all().map(toScene)
    },

    create({ name, icon, actions }, username) {
      const { lastInsertRowid } = insertScene.run(name, icon ?? 'scene')
      writeActions(lastInsertRowid, actions)
      audit?.(username, 'scene.created', { scene: name, actions: actions.length })
      return getScene(lastInsertRowid)
    },

    update(id, { name, icon, actions }, username) {
      const existing = getScene(id)
      updateScene.run(name ?? existing.name, icon ?? existing.icon, id)
      if (actions) writeActions(id, actions)
      audit?.(username, 'scene.updated', { scene: name ?? existing.name })
      return getScene(id)
    },

    remove(id, username) {
      const existing = getScene(id)
      deleteScene.run(id)
      audit?.(username, 'scene.deleted', { scene: existing.name })
    },

    async execute(id, username) {
      const scene = getScene(id)
      const results = []
      for (const action of scene.actions) {
        try {
          const device = await deviceService.executeCommand(
            action.deviceId,
            action.command,
            action.params,
          )
          results.push({ deviceId: action.deviceId, name: device.name, ok: true })
        } catch (err) {
          log.warn('Szenen-Aktion fehlgeschlagen', {
            scene: scene.name,
            device: action.deviceId,
            error: err.message,
          })
          results.push({
            deviceId: action.deviceId,
            name: action.deviceId,
            ok: false,
            error: err.message,
          })
        }
      }
      const ok = results.filter((r) => r.ok).length
      events?.emit('scene.executed', {
        username,
        message: `Szene „${scene.name}" ausgeführt — ${ok} von ${results.length} Aktionen erfolgreich`,
        detail: { scene: scene.name, ok, total: results.length },
      })
      audit?.(username, 'scene.executed', { scene: scene.name, ok, total: results.length })
      return { scene: { id: scene.id, name: scene.name }, results, ok, total: results.length }
    },
  }
}
