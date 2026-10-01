import { useState } from 'react'
import { useAuth } from '../state/AuthContext.jsx'

// Minimalistische Anmelde-/Ersteinrichtungsseite.
// Im Setup-Modus (erster Start) legt der Besitzer Benutzer + Passwort fest.
export function AuthView() {
  const { state, login, setup, refresh } = useAuth()
  const isSetup = state === 'setup'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    if (isSetup && password !== passwordRepeat) {
      setError('Die Passwörter stimmen nicht überein')
      return
    }
    setBusy(true)
    try {
      if (isSetup) await setup(username.trim(), password)
      else await login(username.trim(), password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (state === 'offline') {
    return (
      <div className="auth-screen">
        <div className="auth-card card">
          <AppMark />
          <p className="auth-error">Das Backend ist momentan nicht erreichbar.</p>
          <button className="btn btn-neutral" onClick={refresh}>
            Erneut versuchen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <form className="auth-card card" onSubmit={submit}>
        <AppMark />
        <h1 className="auth-title">{isSetup ? 'Willkommen' : 'Anmelden'}</h1>
        <p className="auth-sub">
          {isSetup
            ? 'Lege einmalig den Zugang für dein SmartHome fest.'
            : 'Melde dich an, um dein Zuhause zu steuern.'}
        </p>

        <label className="auth-label" htmlFor="username">
          Benutzername
        </label>
        <input
          id="username"
          className="auth-input"
          autoComplete="username"
          autoCapitalize="none"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="auth-label" htmlFor="password">
          Passwort
        </label>
        <input
          id="password"
          className="auth-input"
          type="password"
          autoComplete={isSetup ? 'new-password' : 'current-password'}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {isSetup && (
          <>
            <label className="auth-label" htmlFor="password2">
              Passwort wiederholen
            </label>
            <input
              id="password2"
              className="auth-input"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordRepeat}
              onChange={(e) => setPasswordRepeat(e.target.value)}
            />
          </>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="btn btn-primary auth-submit" disabled={busy} type="submit">
          {busy ? 'Einen Moment…' : isSetup ? 'Zugang erstellen' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}

function AppMark() {
  return (
    <div className="auth-mark" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 100 100">
        <rect width="100" height="100" rx="26" fill="var(--surface-2)" />
        <path
          d="M50 26 L78 48 L78 76 L60 76 L60 60 L40 60 L40 76 L22 76 L22 48 Z"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
