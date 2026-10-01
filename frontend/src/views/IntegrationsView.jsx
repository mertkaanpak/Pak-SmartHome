import { useEffect, useState } from 'react'
import { fetchIntegrations, ringAuth, ringDisconnect, saveTuyaSettings } from '../api.js'
import { BottomSheet } from '../components/BottomSheet.jsx'
import { useToast } from '../components/Toast.jsx'
import { IconClose, INTEGRATION_ICONS, IconDevice } from '../components/icons.jsx'

const STATUS_LABELS = {
  connected: { text: 'Verbunden', pill: 'pill-ok' },
  not_configured: { text: 'Nicht eingerichtet', pill: 'pill-muted' },
  error: { text: 'Fehler', pill: 'pill-danger' },
}

const TUYA_DATACENTERS = [
  { url: 'https://openapi.tuyaeu.com', label: 'Europa' },
  { url: 'https://openapi.tuyaus.com', label: 'USA' },
  { url: 'https://openapi.tuyain.com', label: 'Indien' },
  { url: 'https://openapi.tuyacn.com', label: 'China' },
]

// Einrichtung und Status aller Integrationen — komplett in der App.
export function IntegrationsView() {
  const [integrations, setIntegrations] = useState(null)
  const [error, setError] = useState(null)
  const [sheet, setSheet] = useState(null) // 'ring' | 'tuya'

  const load = () => {
    setError(null)
    fetchIntegrations()
      .then((data) => setIntegrations(data.integrations))
      .catch((err) => setError(err.message))
  }
  useEffect(load, [])

  const byName = (name) => integrations?.find((i) => i.name === name)

  return (
    <div className="view">
      <header className="view-header">
        <h1 className="view-title">Integrationen</h1>
        <p className="view-subtitle">Verbundene Systeme einrichten und prüfen</p>
      </header>

      {error && <div className="card banner banner-error">{error}</div>}

      <div className="card status-list">
        {(integrations ?? []).map((integration) => {
          const state = STATUS_LABELS[integration.status] ?? STATUS_LABELS.error
          const IntegrationIcon = INTEGRATION_ICONS[integration.name] ?? IconDevice
          const canManage = integration.name === 'ring' || integration.name === 'tuya'
          return (
            <div className="status-row" key={integration.name}>
              <span className="timeline-icon">
                <IntegrationIcon size={18} />
              </span>
              <span className="status-row-label">
                {integration.label}
                <span className="status-row-sub">
                  {integration.message ?? integration.manufacturer}
                </span>
              </span>
              <span className={`pill ${state.pill}`}>{state.text}</span>
              {canManage && (
                <button className="chip" onClick={() => setSheet(integration.name)}>
                  {integration.configured ? 'Verwalten' : 'Einrichten'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="sheet-meta">
        Kameras folgen, sobald das Kameramodell geprüft ist (ONVIF/RTSP). Die
        WireGuard-Verbindung wird an FRITZ!Box und Server eingerichtet — der Status
        erscheint danach hier.
      </p>

      {sheet === 'ring' && (
        <RingSetupSheet
          configured={byName('ring')?.configured}
          onClose={() => setSheet(null)}
          onChanged={() => {
            setSheet(null)
            load()
          }}
        />
      )}
      {sheet === 'tuya' && (
        <TuyaSetupSheet
          onClose={() => setSheet(null)}
          onChanged={() => {
            setSheet(null)
            load()
          }}
        />
      )}
    </div>
  )
}

// Ring-Anmeldung: E-Mail/Passwort -> ggf. Bestätigungscode -> fertig.
// Die Zugangsdaten gehen nur an die Ring-Server; gespeichert wird allein
// der Zugriffs-Token, verschlüsselt auf dem eigenen Server.
function RingSetupSheet({ configured, onClose, onChanged }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('credentials') // 'credentials' | 'code'
  const [prompt, setPrompt] = useState(null)
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setFormError(null)
    try {
      const result = await ringAuth(email, password, step === 'code' ? code : undefined)
      if (result.needs2fa) {
        setStep('code')
        setPrompt(result.prompt)
      } else {
        toast('Ring ist verbunden')
        onChanged()
      }
    } catch (err) {
      setFormError(err.message)
      if (step === 'code') setCode('')
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      await ringDisconnect()
      toast('Ring-Verbindung getrennt')
      onChanged()
    } catch (err) {
      setFormError(err.message)
      setBusy(false)
    }
  }

  return (
    <BottomSheet open onClose={onClose} label="Ring einrichten">
      <div className="sheet-head">
        <h2 className="sheet-title">Ring {configured ? 'verwalten' : 'verbinden'}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Schließen">
          <IconClose size={19} />
        </button>
      </div>

      {configured && step === 'credentials' && (
        <p className="sheet-sub" style={{ marginBottom: 'var(--space-4)' }}>
          Ring ist verbunden. Du kannst dich neu anmelden oder die Verbindung trennen.
        </p>
      )}

      {step === 'credentials' ? (
        <>
          <label className="auth-label" htmlFor="ring-email">
            Ring E-Mail-Adresse
          </label>
          <input
            id="ring-email"
            className="auth-input"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="auth-label" htmlFor="ring-password">
            Ring Passwort
          </label>
          <input
            id="ring-password"
            className="auth-input"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      ) : (
        <>
          <p className="sheet-sub" style={{ marginBottom: 'var(--space-3)' }}>
            {prompt ?? 'Ring hat dir einen Bestätigungscode geschickt.'}
          </p>
          <label className="auth-label" htmlFor="ring-code">
            Bestätigungscode
          </label>
          <input
            id="ring-code"
            className="auth-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </>
      )}

      {formError && <p className="auth-error">{formError}</p>}

      <div className="sheet-actions-confirm">
        <button
          className="btn btn-primary"
          disabled={busy || (step === 'credentials' ? !email || !password : !code)}
          onClick={submit}
        >
          {busy ? 'Einen Moment…' : step === 'credentials' ? 'Anmelden' : 'Code bestätigen'}
        </button>
        {configured && (
          <button className="btn btn-neutral" disabled={busy} onClick={disconnect}>
            Verbindung trennen
          </button>
        )}
      </div>

      <p className="sheet-meta">
        Deine Ring-Zugangsdaten werden nicht gespeichert — nur der Zugriffs-Token,
        verschlüsselt auf deinem eigenen Server.
      </p>
    </BottomSheet>
  )
}

// Tuya-Zugangsdaten (iot.tuya.com -> Cloud-Projekt) direkt in der App pflegen.
function TuyaSetupSheet({ onClose, onChanged }) {
  const toast = useToast()
  const [accessId, setAccessId] = useState('')
  const [accessSecret, setAccessSecret] = useState('')
  const [apiUrl, setApiUrl] = useState(TUYA_DATACENTERS[0].url)
  const [formError, setFormError] = useState(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    setFormError(null)
    try {
      await saveTuyaSettings({ accessId, accessSecret, apiUrl })
      toast('Tuya-Zugangsdaten gespeichert')
      onChanged()
    } catch (err) {
      setFormError(err.message)
      setBusy(false)
    }
  }

  return (
    <BottomSheet open onClose={onClose} label="Tuya einrichten">
      <div className="sheet-head">
        <h2 className="sheet-title">Tuya-Zugangsdaten</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Schließen">
          <IconClose size={19} />
        </button>
      </div>
      <p className="sheet-sub" style={{ marginBottom: 'var(--space-4)' }}>
        Access ID und Secret findest du im Cloud-Projekt auf iot.tuya.com. Neue
        Werte ersetzen die bisherigen sofort.
      </p>

      <label className="auth-label" htmlFor="tuya-id">
        Access ID
      </label>
      <input
        id="tuya-id"
        className="auth-input"
        autoComplete="off"
        value={accessId}
        onChange={(e) => setAccessId(e.target.value)}
      />
      <label className="auth-label" htmlFor="tuya-secret">
        Access Secret
      </label>
      <input
        id="tuya-secret"
        className="auth-input"
        type="password"
        autoComplete="off"
        value={accessSecret}
        onChange={(e) => setAccessSecret(e.target.value)}
      />

      <div className="sheet-section" style={{ marginTop: 0 }}>
        <h3 className="sheet-section-title">Rechenzentrum</h3>
        <div className="chip-row">
          {TUYA_DATACENTERS.map((dc) => (
            <button
              key={dc.url}
              className={`chip ${apiUrl === dc.url ? 'selected' : ''}`}
              onClick={() => setApiUrl(dc.url)}
              aria-pressed={apiUrl === dc.url}
            >
              {dc.label}
            </button>
          ))}
        </div>
      </div>

      {formError && <p className="auth-error">{formError}</p>}

      <div className="sheet-actions-confirm">
        <button
          className="btn btn-primary"
          disabled={busy || !accessId.trim() || !accessSecret.trim()}
          onClick={save}
        >
          Speichern
        </button>
      </div>

      <p className="sheet-meta">
        Die Daten werden verschlüsselt auf deinem Server gespeichert und haben
        Vorrang vor der .env-Datei.
      </p>
    </BottomSheet>
  )
}
