import { config } from '../../config.js'
import { IntegrationError } from '../../errors.js'

// Adapter für die Ring-Türklingel. Wird über ring-client-api implementiert
// (Phase 5), sobald per `npx -p ring-client-api ring-auth-cli` ein
// Refresh-Token erzeugt wurde. ring-client-api bleibt eine reine
// Adapter-Abhängigkeit — der Rest des Systems kennt nur dieses Modul.
export function createRingAdapter() {
  const configured = Boolean(config.ring.refreshToken)

  return {
    name: 'ring',
    label: 'Türklingel',
    manufacturer: 'Ring',
    configured,

    async getDevices() {
      throw new IntegrationError('Ring-Integration noch nicht implementiert')
    },

    async executeCommand() {
      throw new IntegrationError('Ring-Integration noch nicht implementiert')
    },

    async healthCheck() {
      if (!configured) return { status: 'not_configured' }
      return { status: 'error', message: 'Ring-Integration noch nicht implementiert' }
    },
  }
}
