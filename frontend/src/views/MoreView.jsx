import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHealth, fetchIntegrations, sendTestPush } from '../api.js'
import {
  IconBell,
  IconBolt,
  IconChevronRight,
  IconClock,
  IconDevice,
  IconRefresh,
} from '../components/icons.jsx'
import { getTheme, setTheme } from '../lib/theme.js'
import { useToast } from '../components/Toast.jsx'
import {
  disablePush,
  enablePush,
  getPushState,
  isIosSafariNonStandalone,
} from '../lib/push.js'
import { useAuth } from '../state/AuthContext.jsx'

const HEALTH_LABELS = {
  connected: { text: 'Verbunden', pill: 'pill-ok' },
  not_configured: { text: 'Nicht eingerichtet', pill: 'pill-muted' },
  error: { text: 'Fehler', pill: 'pill-danger' },
}

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
]

// „Mehr": echter Systemstatus (Backend, Datenbank, Integrationen),
// Darstellung (Theme) und App-Informationen.
export function MoreView() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [pushState, setPushState] = useState('loading') // loading|on|off|denied|unsupported
  const [pushBusy, setPushBusy] = useState(false)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    getPushState().then(setPushState)
  }, [])

  const togglePush = async () => {
    setPushBusy(true)
    try {
      if (pushState === 'on') {
        await disablePush()
        setPushState('off')
        toast('Benachrichtigungen aus')
      } else {
        await enablePush()
        setPushState('on')
        toast('Benachrichtigungen aktiviert')
      }
    } catch (err) {
      toast(err.message, 'error')
      setPushState(await getPushState())
    } finally {
      setPushBusy(false)
    }
  }

  const testPush = async () => {
    try {
      await sendTestPush()
      toast('Test-Benachrichtigung gesendet')
    } catch (err) {
      toast(err.message, 'error')
    }
  }
  const [integrations, setIntegrations] = useState(null)
  const [error, setError] = useState(null)
  const [theme, setThemeState] = useState(getTheme())

  const load = () => {
    setError(null)
    Promise.all([fetchHealth(), fetchIntegrations()])
      .then(([h, i]) => {
        setHealth(h)
        setIntegrations(i.integrations)
      })
      .catch((err) => setError(err.message))
  }

  useEffect(load, [])

  const chooseTheme = (value) => {
    setTheme(value)
    setThemeState(value)
  }

  return (
    <div className="view">
      <header className="view-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 className="view-title">Mehr</h1>
          <p className="view-subtitle">System, Darstellung und Infos</p>
        </div>
        <button className="icon-btn" onClick={load} aria-label="Status aktualisieren">
          <IconRefresh size={19} />
        </button>
      </header>

      {error && <div className="card banner banner-error">{error}</div>}

      <section className="section">
        <h2 className="section-title">Benachrichtigungen</h2>
        <div className="card status-list">
          <div className="status-row">
            <span className="timeline-icon">
              <IconBell size={18} />
            </span>
            <span className="status-row-label">
              Push aufs Handy
              <span className="status-row-sub">
                {pushState === 'on'
                  ? 'Aktiv — Klingeln & Bewegung von Ring'
                  : pushState === 'denied'
                    ? 'Im Browser/Gerät blockiert — in den Einstellungen erlauben'
                    : pushState === 'unsupported'
                      ? 'Auf diesem Gerät nicht verfügbar'
                      : 'Klingeln und Bewegung sofort erhalten'}
              </span>
            </span>
            {(pushState === 'on' || pushState === 'off') && (
              <button
                className={`switch ${pushState === 'on' ? 'on' : ''}`}
                role="switch"
                aria-checked={pushState === 'on'}
                aria-label="Benachrichtigungen umschalten"
                disabled={pushBusy}
                onClick={togglePush}
              />
            )}
          </div>
          {pushState === 'on' && (
            <button className="status-row status-row-link" onClick={testPush}>
              <span className="timeline-icon">
                <IconRefresh size={18} />
              </span>
              <span className="status-row-label">Test-Benachrichtigung senden</span>
              <IconChevronRight size={17} />
            </button>
          )}
        </div>
        {isIosSafariNonStandalone() && pushState !== 'unsupported' && (
          <p className="sheet-meta">
            iPhone: Benachrichtigungen funktionieren nur, wenn die App über das
            Teilen-Symbol zum Home-Bildschirm hinzugefügt und von dort geöffnet wird.
          </p>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Systemstatus</h2>
        <div className="card status-list">
          <div className="status-row">
            <span className="status-row-label">Backend</span>
            <span className={`pill ${health ? 'pill-ok' : 'pill-muted'}`}>
              {health ? 'Online' : 'Prüfe…'}
            </span>
          </div>
          <div className="status-row">
            <span className="status-row-label">Datenbank</span>
            <span
              className={`pill ${
                health == null ? 'pill-muted' : health.database === 'ok' ? 'pill-ok' : 'pill-danger'
              }`}
            >
              {health == null ? 'Prüfe…' : health.database === 'ok' ? 'Online' : 'Fehler'}
            </span>
          </div>
          {(integrations ?? []).map((integration) => {
            const state = HEALTH_LABELS[integration.status] ?? HEALTH_LABELS.error
            return (
              <div className="status-row" key={integration.name}>
                <span className="status-row-label">
                  {integration.label}
                  {integration.message && (
                    <span className="status-row-sub">{integration.message}</span>
                  )}
                </span>
                <span className={`pill ${state.pill}`}>{state.text}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Darstellung</h2>
        <div className="card theme-switch" role="radiogroup" aria-label="Design wählen">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`chip ${theme === option.value ? 'selected' : ''}`}
              role="radio"
              aria-checked={theme === option.value}
              onClick={() => chooseTheme(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Steuerung</h2>
        <div className="card status-list">
          <Link to="/automationen" className="status-row status-row-link">
            <span className="timeline-icon">
              <IconBolt size={18} />
            </span>
            <span className="status-row-label">Automationen</span>
            <IconChevronRight size={17} />
          </Link>
          <Link to="/ereignisse" className="status-row status-row-link">
            <span className="timeline-icon">
              <IconClock size={18} />
            </span>
            <span className="status-row-label">Ereignis-Timeline</span>
            <IconChevronRight size={17} />
          </Link>
          <Link to="/integrationen" className="status-row status-row-link">
            <span className="timeline-icon">
              <IconDevice size={18} />
            </span>
            <span className="status-row-label">Integrationen</span>
            <IconChevronRight size={17} />
          </Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Konto</h2>
        <div className="card status-list">
          <div className="status-row">
            <span className="status-row-label">
              {user?.username}
              <span className="status-row-sub">
                {user?.role === 'admin' ? 'Administrator' : 'Benutzer'}
              </span>
            </span>
            <button className="chip" onClick={logout}>
              Abmelden
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">App</h2>
        <div className="card status-list">
          <div className="status-row">
            <span className="status-row-label">
              Pak SmartHome
              <span className="status-row-sub">Eigenes SmartHome-Kontrollzentrum</span>
            </span>
            <span className="pill pill-muted">v0.2</span>
          </div>
        </div>
      </section>
    </div>
  )
}
