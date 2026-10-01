import { useEffect, useState } from 'react'
import { createScene, deleteScene, executeScene, fetchScenes, updateScene } from '../api.js'
import { BottomSheet } from '../components/BottomSheet.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  IconCheck,
  IconClose,
  IconEdit,
  IconScenes,
  IconTrash,
  SCENE_ICONS,
} from '../components/icons.jsx'
import { useDevices } from '../state/DevicesContext.jsx'

// Vorlagen für den schnellen Einstieg — erzeugen echte Szenen über die
// realen Geräte, keine Attrappen.
const TEMPLATES = [
  { name: 'Gute Nacht', icon: 'moon', command: 'close' },
  { name: 'Guten Morgen', icon: 'sun', command: 'open' },
  { name: 'Haus verlassen', icon: 'leave', command: 'close' },
]

export function ScenesView() {
  const { devices } = useDevices()
  const toast = useToast()
  const [scenes, setScenes] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // Szene oder 'new' / Template-Vorlage
  const [running, setRunning] = useState(null) // { scene, result? }

  const covers = (devices ?? []).filter((d) => d.type === 'cover')

  const load = () => {
    fetchScenes()
      .then((data) => setScenes(data.scenes))
      .catch((err) => setError(err.message))
  }
  useEffect(load, [])

  const run = async (scene) => {
    setRunning({ scene })
    try {
      const result = await executeScene(scene.id)
      setRunning({ scene, result })
    } catch (err) {
      setRunning(null)
      toast(err.message, 'error')
    }
  }

  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">Szenen</h1>
        <p className="view-subtitle">Mehrere Aktionen mit einem Tipp</p>
      </header>

      {error && <div className="card banner banner-error">{error}</div>}

      {scenes?.length > 0 && (
        <div className="card-list cols-2">
          {scenes.map((scene, i) => {
            const SceneIcon = SCENE_ICONS[scene.icon] ?? IconScenes
            return (
              <article key={scene.id} className="card scene-card" style={{ '--i': i }}>
                <button className="scene-main" onClick={() => run(scene)}>
                  <span className="scene-icon">
                    <SceneIcon size={22} />
                  </span>
                  <span className="scene-name">{scene.name}</span>
                  <span className="scene-meta">
                    {scene.actions.length} {scene.actions.length === 1 ? 'Aktion' : 'Aktionen'} ·
                    Tippen zum Ausführen
                  </span>
                </button>
                <button
                  className="icon-btn scene-edit"
                  onClick={() => setEditing(scene)}
                  aria-label={`Szene ${scene.name} bearbeiten`}
                >
                  <IconEdit size={17} />
                </button>
              </article>
            )
          })}
        </div>
      )}

      {scenes?.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">
            <IconScenes size={28} />
          </div>
          <h3>Noch keine Szenen</h3>
          <p>Starte mit einer Vorlage oder erstelle eine eigene Szene.</p>
        </div>
      )}

      {scenes && (
        <div className="chip-row" style={{ marginTop: 'var(--space-4)' }}>
          {TEMPLATES.filter((t) => !scenes.some((s) => s.name === t.name)).map((t) => (
            <button
              key={t.name}
              className="chip"
              onClick={() =>
                setEditing({
                  name: t.name,
                  icon: t.icon,
                  actions: covers.map((d) => ({ deviceId: d.id, command: t.command })),
                })
              }
            >
              + {t.name}
            </button>
          ))}
          <button className="chip" onClick={() => setEditing('new')}>
            + Eigene Szene
          </button>
        </div>
      )}

      {editing && (
        <SceneEditor
          scene={editing === 'new' ? null : editing}
          covers={covers}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}

      <SceneRunSheet running={running} onClose={() => setRunning(null)} />
    </div>
  )
}

const ICON_CHOICES = ['scene', 'moon', 'sun', 'leave']
const ACTION_CHOICES = [
  { value: null, label: '–' },
  { value: 'open', label: 'Auf' },
  { value: 'close', label: 'Zu' },
]

function SceneEditor({ scene, covers, onClose, onSaved }) {
  const toast = useToast()
  const isExisting = Boolean(scene?.id)
  const [name, setName] = useState(scene?.name ?? '')
  const [icon, setIcon] = useState(scene?.icon ?? 'scene')
  const [commands, setCommands] = useState(() => {
    const map = {}
    for (const action of scene?.actions ?? []) map[action.deviceId] = action.command
    return map
  })
  const [busy, setBusy] = useState(false)

  const actions = covers
    .filter((d) => commands[d.id])
    .map((d) => ({ deviceId: d.id, command: commands[d.id] }))

  const save = async () => {
    setBusy(true)
    try {
      const payload = { name: name.trim(), icon, actions }
      if (isExisting) await updateScene(scene.id, payload)
      else await createScene(payload)
      toast(`Szene „${payload.name}" gespeichert`)
      onSaved()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deleteScene(scene.id)
      toast(`Szene „${scene.name}" gelöscht`)
      onSaved()
    } catch (err) {
      toast(err.message, 'error')
      setBusy(false)
    }
  }

  return (
    <BottomSheet open onClose={onClose} label="Szene bearbeiten">
      <div className="sheet-head">
        <h2 className="sheet-title">{isExisting ? 'Szene bearbeiten' : 'Neue Szene'}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Schließen">
          <IconClose size={19} />
        </button>
      </div>

      <label className="auth-label" htmlFor="scene-name">
        Name
      </label>
      <input
        id="scene-name"
        className="auth-input"
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Gute Nacht"
      />

      <div className="sheet-section" style={{ marginTop: 0 }}>
        <h3 className="sheet-section-title">Symbol</h3>
        <div className="chip-row">
          {ICON_CHOICES.map((key) => {
            const ChoiceIcon = SCENE_ICONS[key]
            return (
              <button
                key={key}
                className={`chip ${icon === key ? 'selected' : ''}`}
                onClick={() => setIcon(key)}
                aria-pressed={icon === key}
              >
                <ChoiceIcon size={16} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="sheet-section">
        <h3 className="sheet-section-title">Rollläden</h3>
        <div className="scene-action-list">
          {covers.map((device) => (
            <div className="scene-action-row" key={device.id}>
              <span className="scene-action-name">
                {device.name}
                {device.room && <span className="status-row-sub">{device.room}</span>}
              </span>
              <div className="segmented">
                {ACTION_CHOICES.map((choice) => (
                  <button
                    key={choice.label}
                    className={`segment ${commands[device.id] === choice.value || (!commands[device.id] && !choice.value) ? 'selected' : ''}`}
                    onClick={() =>
                      setCommands((map) => ({ ...map, [device.id]: choice.value }))
                    }
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="sheet-actions-confirm">
        <button
          className="btn btn-primary"
          disabled={busy || !name.trim() || actions.length === 0}
          onClick={save}
        >
          {actions.length === 0 ? 'Mindestens eine Aktion wählen' : 'Speichern'}
        </button>
        {isExisting && (
          <button className="btn btn-neutral" disabled={busy} onClick={remove}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconTrash size={16} /> Szene löschen
            </span>
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

function SceneRunSheet({ running, onClose }) {
  if (!running) return null
  const { scene, result } = running
  return (
    <BottomSheet open onClose={onClose} label="Szenen-Ausführung">
      <h2 className="sheet-title">
        {result ? `${scene.name}` : `${scene.name} wird ausgeführt…`}
      </h2>
      {!result && <p className="sheet-sub">Aktionen laufen nacheinander.</p>}
      {result && (
        <>
          <p className="sheet-sub">
            {result.ok} von {result.total} Aktionen erfolgreich
          </p>
          <div className="scene-result-list">
            {result.results.map((r) => (
              <div className="scene-result-row" key={r.deviceId}>
                <span className={`scene-result-icon ${r.ok ? 'ok' : 'fail'}`}>
                  {r.ok ? <IconCheck size={16} /> : <IconClose size={16} />}
                </span>
                <span className="scene-action-name">
                  {r.name}
                  {!r.ok && <span className="status-row-sub">{r.error}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="sheet-actions-confirm">
            <button className="btn btn-neutral" onClick={onClose}>
              Fertig
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  )
}
