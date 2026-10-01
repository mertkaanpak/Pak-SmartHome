import { useEffect, useState } from 'react'
import { fetchHealth, fetchIntegrations } from '../api.js'
import { IconRefresh } from '../components/icons.jsx'
import { getTheme, setTheme } from '../lib/theme.js'
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
  const [health, setHealth] = useState(null)
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
