// Fehler mit HTTP-Status und benutzerverständlicher (deutscher) Meldung.
// Die Meldung wird dem Frontend angezeigt; technische Details gehören
// in `details` bzw. ins Log, nicht in `message`.
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }
}

// Fehler aus einer Integration (Tuya, Ring, …): externe API nicht erreichbar,
// abgelehnter Befehl usw. Wird als 502 an den Client gemeldet.
export class IntegrationError extends HttpError {
  constructor(message, details) {
    super(502, message, details)
    this.name = 'IntegrationError'
  }
}
