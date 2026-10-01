import { SESSION_COOKIE } from '../core/auth.js'

// Schützt alle Geräte-/System-Routen: ohne gültige Session kommt 401,
// mit gültiger Session steht der Benutzer unter req.user bereit.
export function createRequireAuth(auth) {
  return (req, res, next) => {
    const user = auth.verifySession(req.cookies?.[SESSION_COOKIE])
    if (!user) {
      // code AUTH_REQUIRED: nur DIESES 401 schickt das Frontend zurück zum
      // Login — 401/4xx aus Integrationen (z. B. Ring) bleiben im Formular.
      return res.status(401).json({ error: 'Anmeldung erforderlich', code: 'AUTH_REQUIRED' })
    }
    req.user = user
    next()
  }
}
