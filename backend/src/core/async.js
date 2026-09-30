import { IntegrationError } from '../errors.js'

// Externe APIs dürfen das System nicht blockieren: jede Integrationsanfrage
// läuft gegen ein Zeitlimit und schlägt danach mit verständlicher Meldung fehl.
export function withTimeout(promise, ms, message) {
  let timer
  const timeout = new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new IntegrationError(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
