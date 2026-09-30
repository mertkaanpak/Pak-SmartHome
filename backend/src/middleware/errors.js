import { HttpError } from '../errors.js'
import { createLogger } from '../logger.js'

const log = createLogger('http')

export function notFound(req, res) {
  res.status(404).json({ error: 'Nicht gefunden' })
}

// Zentrale Fehlerbehandlung: HttpError-Instanzen tragen Status und eine
// benutzerverständliche Meldung; alles andere ist ein unerwarteter Fehler
// und wird nur geloggt, nie als Stacktrace an den Client gegeben.
// eslint-disable-next-line no-unused-vars -- Express erkennt Error-Middleware an 4 Parametern
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    log.warn(err.message, { status: err.status, path: req.path, details: err.details })
    return res.status(err.status).json({ error: err.message, details: err.details })
  }
  // Ungültiges JSON im Request-Body (express.json)
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Ungültiger JSON-Body' })
  }
  log.error('Unerwarteter Fehler', { path: req.path, stack: err?.stack ?? String(err) })
  res.status(500).json({ error: 'Interner Serverfehler' })
}
