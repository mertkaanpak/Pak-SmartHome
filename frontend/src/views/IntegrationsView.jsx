import { useEffect, useState } from 'react'
import {
  addCamera,
  deleteCamera,
  fetchCameras,
  fetchIntegrations,
  ringAuth,
  ringDisconnect,
  saveTuyaSettings,
  testCamera,
} from '../api.js'
import { BottomSheet } from '../components/BottomSheet.jsx'
import { useToast } from '../components/Toast.jsx'
import { IconClose, INTEGRATION_ICONS, IconDevice, IconTrash } from '../components/icons.jsx'

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
          const canManage = ['ring', 'tuya', 'cameras'].includes(integration.name)
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
        Die WireGuard-Verbindung wird an FRITZ!Box und Server eingerichtet — der
        Status erscheint danach hier.
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
      {sheet === 'cameras' && (
        <CamerasSetupSheet onClose={() => setSheet(null)} onChanged={load} />
      )}
    </div>
  )
}

// Kameras lokal hinzufügen (EseeCloud-HTTP oder RTSP) — kein Cloud-Konto nötig.
function CamerasSetupSheet({ onClose, onChanged }) {
  const toast = useToast()
  const [cameras, setCameras] = useState(null)
  const [gatewayInfo, setGatewayInfo] = useState(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [source, setSource] = useState('eseecloud')
  const [busy, setBusy] = useState(false)

  const load = () => {
    fetchCameras()
      .then((data) => {
        setCameras(data.cameras)
        setGatewayInfo(data.gateway)
      })
      .catch((err) => toast(err.message, 'error'))
  }
  useEffect(load, [])

  const save = async () => {
    setBusy(true)
    try {
      await addCamera({ name: name.trim(), host: host.trim(), username, password, source })
      toast(`Kamera „${name.trim()}" hinzugefügt`)
      setAdding(false)
      setName('')
      setHost('')
      setPassword('')
      load()
      onChanged()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (camera) => {
    try {
      await deleteCamera(camera.id)
      toast(`Kamera „${camera.name}" entfernt`)
      load()
      onChanged()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const test = async (camera) => {
    try {
      const result = await testCamera(camera.id)
      toast(result.message, result.reachable ? 'info' : 'error')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <BottomSheet open onClose={onClose} label="Kameras verwalten">
      <div className="sheet-head">
        <h2 className="sheet-title">Kameras</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Schließen">
          <IconClose size={19} />
        </button>
      </div>

      {gatewayInfo && !gatewayInfo.available && (
        <p className="auth-error">
          Media-Gateway (go2rtc) fehlt auf dem Server — Live-Streams sind deaktiviert.
        </p>
      )}

      {cameras?.length > 0 && (
        <div className="scene-action-list" style={{ marginBottom: 'var(--space-4)' }}>
          {cameras.map((camera) => (
            <div className="scene-action-row" key={camera.id}>
              <span className="scene-action-name">
                {camera.name}
                <span className="status-row-sub">
                  {camera.host} · {camera.source === 'rtsp' ? 'RTSP' : 'EseeCloud'}
                </span>
              </span>
              <button className="chip" onClick={() => test(camera)}>
                Testen
              </button>
              <button
                className="icon-btn"
                style={{ width: 34, height: 34 }}
                onClick={() => remove(camera)}
                aria-label={`${camera.name} entfernen`}
              >
                <IconTrash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <div className="sheet-actions-confirm">
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            Kamera hinzufügen
          </button>
        </div>
      ) : (
        <>
          <label className="auth-label" htmlFor="cam-name">
            Name
          </label>
          <input
            id="cam-name"
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Einfahrt"
          />
          <label className="auth-label" htmlFor="cam-host">
            IP-Adresse der Kamera
          </label>
          <input
            id="cam-host"
            className="auth-input"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="z. B. 192.168.178.50"
            inputMode="decimal"
          />
          <label className="auth-label" htmlFor="cam-user">
            Benutzer
          </label>
          <input
            id="cam-user"
            className="auth-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label className="auth-label" htmlFor="cam-pass">
            Kamera-Passwort (ggf. leer lassen)
          </label>
          <input
            id="cam-pass"
            className="auth-input"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="sheet-section" style={{ marginTop: 0 }}>
            <h3 className="sheet-section-title">Verbindungsart</h3>
            <div className="chip-row">
              <button
                className={`chip ${source === 'eseecloud' ? 'selected' : ''}`}
                onClick={() => setSource('eseecloud')}
              >
                EseeCloud (JA-Modelle)
              </button>
              <button
                className={`chip ${source === 'rtsp' ? 'selected' : ''}`}
                onClick={() => setSource('rtsp')}
              >
                RTSP
              </button>
            </div>
          </div>
          <div className="sheet-actions-confirm">
            <button
              className="btn btn-primary"
              disabled={busy || !name.trim() || !host.trim()}
              onClick={save}
            >
              Speichern
            </button>
            <button className="btn btn-neutral" onClick={() => setAdding(false)}>
              Abbrechen
            </button>
          </div>
        </>
      )}

      <p className="sheet-meta">
        Die IP-Adresse deiner Kamera findest du in der FRITZ!Box unter Heimnetz →
        Netzwerk. Zugangsdaten werden verschlüsselt auf deinem Server gespeichert;
        die Streams laufen lokal, ohne EseeCloud-Cloud.
      </p>
    </BottomSheet>
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
