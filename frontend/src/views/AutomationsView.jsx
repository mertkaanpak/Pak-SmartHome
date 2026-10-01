import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  createAutomation,
  deleteAutomation,
  fetchAutomations,
  fetchScenes,
  runAutomation,
  updateAutomation,
} from '../api.js'
import { BottomSheet } from '../components/BottomSheet.jsx'
import { useToast } from '../components/Toast.jsx'
import { IconBolt, IconClose, IconMoon, IconSun, IconTrash } from '../components/icons.jsx'

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const WORKDAYS = [0, 1, 2, 3, 4]
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]

const nextRunFormat = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function weekdaysLabel(weekdays) {
  const sorted = [...weekdays].sort()
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
  if (same(sorted, ALL_DAYS)) return 'Täglich'
  if (same(sorted, WORKDAYS)) return 'Werktags'
  if (same(sorted, [5, 6])) return 'Am Wochenende'
  return sorted.map((d) => WEEKDAY_LABELS[d]).join(', ')
}

function triggerLabel(trigger) {
  if (trigger.type === 'time') return `${trigger.time} Uhr`
  const base = trigger.event === 'sunrise' ? 'Sonnenaufgang' : 'Sonnenuntergang'
  const offset = trigger.offsetMinutes ?? 0
  if (offset === 0) return `Bei ${base}`
  return `${Math.abs(offset)} Min. ${offset > 0 ? 'nach' : 'vor'} ${base}`
}

// Automationen werden ausschließlich hier vom Benutzer angelegt und
// verwaltet — es gibt keine vorgefertigten Abläufe.
export function AutomationsView() {
  const toast = useToast()
  const [automations, setAutomations] = useState(null)
  const [scenes, setScenes] = useState([])
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // Automation oder 'new'

  const load = () => {
    Promise.all([fetchAutomations(), fetchScenes()])
      .then(([a, s]) => {
        setAutomations(a.automations)
        setScenes(s.scenes)
      })
      .catch((err) => setError(err.message))
  }
  useEffect(load, [])

  const toggle = async (automation) => {
    try {
      await updateAutomation(automation.id, { enabled: !automation.enabled })
      load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const sceneName = (id) => scenes.find((s) => s.id === id)?.name

  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">Automationen</h1>
        <p className="view-subtitle">Dein Zuhause reagiert von selbst</p>
      </header>

      {error && <div className="card banner banner-error">{error}</div>}

      {automations?.length > 0 && (
        <div className="card-list">
          {automations.map((automation, i) => (
            <article key={automation.id} className="card automation-card" style={{ '--i': i }}>
              <button className="automation-main" onClick={() => setEditing(automation)}>
                <span className="automation-icon">
                  {automation.trigger.type === 'sun' ? (
                    automation.trigger.event === 'sunrise' ? (
                      <IconSun size={20} />
                    ) : (
                      <IconMoon size={20} />
                    )
                  ) : (
                    <IconBolt size={20} />
                  )}
                </span>
                <span className="automation-info">
                  <span className="automation-name">{automation.name}</span>
                  <span className="automation-meta">
                    {weekdaysLabel(automation.weekdays)} · {triggerLabel(automation.trigger)}
                    {' · '}
                    {sceneName(automation.sceneId) ?? 'Szene fehlt'}
                  </span>
                  {automation.enabled && automation.nextRun && (
                    <span className="automation-next">
                      Als Nächstes: {nextRunFormat.format(automation.nextRun)} Uhr
                    </span>
                  )}
                </span>
              </button>
              <button
                className={`switch ${automation.enabled ? 'on' : ''}`}
                role="switch"
                aria-checked={automation.enabled}
                aria-label={`${automation.name} ${automation.enabled ? 'deaktivieren' : 'aktivieren'}`}
                onClick={() => toggle(automation)}
              />
            </article>
          ))}
        </div>
      )}

      {automations?.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">
            <IconBolt size={28} />
          </div>
          <h3>Noch keine Automationen</h3>
          <p>
            Lass dein Zuhause von selbst reagieren — zum Beispiel „werktags um 7:30 die
            Guten-Morgen-Szene" oder „bei Sonnenuntergang alles schließen".
          </p>
        </div>
      )}

      {automations && scenes.length === 0 && (
        <p className="sheet-meta">
          Automationen führen Szenen aus. <Link to="/szenen">Lege zuerst eine Szene an</Link> —
          danach kannst du sie hier zeitlich steuern.
        </p>
      )}

      {automations && scenes.length > 0 && (
        <div className="chip-row" style={{ marginTop: 'var(--space-4)' }}>
          <button className="chip" onClick={() => setEditing('new')}>
            + Neue Automation
          </button>
        </div>
      )}

      {editing && (
        <AutomationEditor
          automation={editing === 'new' ? null : editing}
          scenes={scenes}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function AutomationEditor({ automation, scenes, onClose, onSaved }) {
  const toast = useToast()
  const isExisting = Boolean(automation?.id)
  const [name, setName] = useState(automation?.name ?? '')
  const [triggerType, setTriggerType] = useState(automation?.trigger.type ?? 'time')
  const [time, setTime] = useState(
    automation?.trigger.type === 'time' ? automation.trigger.time : '07:30',
  )
  const [sunEvent, setSunEvent] = useState(
    automation?.trigger.type === 'sun' ? automation.trigger.event : 'sunset',
  )
  const [offset, setOffset] = useState(
    automation?.trigger.type === 'sun' ? (automation.trigger.offsetMinutes ?? 0) : 0,
  )
  const [weekdays, setWeekdays] = useState(automation?.weekdays ?? WORKDAYS)
  const [sceneId, setSceneId] = useState(automation?.sceneId ?? null)
  const [busy, setBusy] = useState(false)

  const toggleDay = (day) =>
    setWeekdays((list) =>
      list.includes(day) ? list.filter((d) => d !== day) : [...list, day],
    )

  const payload = () => ({
    name: name.trim(),
    trigger:
      triggerType === 'time'
        ? { type: 'time', time }
        : { type: 'sun', event: sunEvent, offsetMinutes: Number(offset) || 0 },
    weekdays,
    sceneId,
  })

  const save = async () => {
    setBusy(true)
    try {
      if (isExisting) await updateAutomation(automation.id, payload())
      else await createAutomation(payload())
      toast(`Automation „${name.trim()}" gespeichert`)
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
      await deleteAutomation(automation.id)
      toast(`Automation „${automation.name}" gelöscht`)
      onSaved()
    } catch (err) {
      toast(err.message, 'error')
      setBusy(false)
    }
  }

  const testRun = async () => {
    setBusy(true)
    try {
      const result = await runAutomation(automation.id)
      toast(`Testlauf: ${result.ok} von ${result.total} Aktionen erfolgreich`)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const valid = name.trim() && weekdays.length > 0 && sceneId != null

  return (
    <BottomSheet open onClose={onClose} label="Automation bearbeiten">
      <div className="sheet-head">
        <h2 className="sheet-title">{isExisting ? 'Automation bearbeiten' : 'Neue Automation'}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Schließen">
          <IconClose size={19} />
        </button>
      </div>

      <label className="auth-label" htmlFor="automation-name">
        Name
      </label>
      <input
        id="automation-name"
        className="auth-input"
        value={name}
        maxLength={60}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Morgens öffnen"
      />

      <div className="sheet-section" style={{ marginTop: 0 }}>
        <h3 className="sheet-section-title">Auslöser</h3>
        <div className="chip-row">
          <button
            className={`chip ${triggerType === 'time' ? 'selected' : ''}`}
            onClick={() => setTriggerType('time')}
          >
            Uhrzeit
          </button>
          <button
            className={`chip ${triggerType === 'sun' && sunEvent === 'sunrise' ? 'selected' : ''}`}
            onClick={() => {
              setTriggerType('sun')
              setSunEvent('sunrise')
            }}
          >
            Sonnenaufgang
          </button>
          <button
            className={`chip ${triggerType === 'sun' && sunEvent === 'sunset' ? 'selected' : ''}`}
            onClick={() => {
              setTriggerType('sun')
              setSunEvent('sunset')
            }}
          >
            Sonnenuntergang
          </button>
        </div>
        {triggerType === 'time' ? (
          <input
            type="time"
            className="auth-input"
            style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-label="Uhrzeit"
          />
        ) : (
          <div className="slider-row" style={{ marginTop: 'var(--space-3)' }}>
            <input
              type="range"
              min="-60"
              max="60"
              step="5"
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
              aria-label="Verschiebung in Minuten"
            />
            <span className="slider-value" style={{ minWidth: '5.5em' }}>
              {Number(offset) === 0
                ? 'pünktlich'
                : `${offset > 0 ? '+' : ''}${offset} Min.`}
            </span>
          </div>
        )}
      </div>

      <div className="sheet-section">
        <h3 className="sheet-section-title">Wochentage</h3>
        <div className="chip-row">
          {WEEKDAY_LABELS.map((label, day) => (
            <button
              key={label}
              className={`chip ${weekdays.includes(day) ? 'selected' : ''}`}
              onClick={() => toggleDay(day)}
              aria-pressed={weekdays.includes(day)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="sheet-section">
        <h3 className="sheet-section-title">Szene ausführen</h3>
        <div className="chip-row">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              className={`chip ${sceneId === scene.id ? 'selected' : ''}`}
              onClick={() => setSceneId(scene.id)}
              aria-pressed={sceneId === scene.id}
            >
              {scene.name}
            </button>
          ))}
        </div>
      </div>

      <div className="sheet-actions-confirm">
        <button className="btn btn-primary" disabled={busy || !valid} onClick={save}>
          Speichern
        </button>
        {isExisting && (
          <button className="btn btn-neutral" disabled={busy} onClick={testRun}>
            Jetzt testweise ausführen
          </button>
        )}
        {isExisting && (
          <button className="btn btn-neutral" disabled={busy} onClick={remove}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconTrash size={16} /> Löschen
            </span>
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
