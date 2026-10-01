import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { authLogin, authLogout, authSetup, fetchAuthStatus } from '../api.js'

const AuthContext = createContext(null)

// Auth-Zustand der App: 'loading' | 'setup' | 'login' | 'authed' | 'offline'
export function AuthProvider({ children }) {
  const [state, setState] = useState('loading')
  const [user, setUser] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const status = await fetchAuthStatus()
      if (status.authenticated) {
        setUser(status.user)
        setState('authed')
      } else {
        setUser(null)
        setState(status.needsSetup ? 'setup' : 'login')
      }
    } catch {
      setState('offline')
    }
  }, [])

  useEffect(() => {
    refresh()
    const onUnauthorized = () => {
      setUser(null)
      setState((s) => (s === 'authed' ? 'login' : s))
    }
    window.addEventListener('pak:unauthorized', onUnauthorized)
    return () => window.removeEventListener('pak:unauthorized', onUnauthorized)
  }, [refresh])

  const login = useCallback(async (username, password) => {
    const { user: loggedIn } = await authLogin(username, password)
    setUser(loggedIn)
    setState('authed')
  }, [])

  const setup = useCallback(async (username, password) => {
    const { user: created } = await authSetup(username, password)
    setUser(created)
    setState('authed')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authLogout()
    } finally {
      setUser(null)
      setState('login')
    }
  }, [])

  return (
    <AuthContext.Provider value={{ state, user, login, setup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
