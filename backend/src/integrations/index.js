import { createTuyaAdapter } from './tuya/index.js'
import { createRingAdapter } from './ring/index.js'
import { createOnvifAdapter } from './onvif/index.js'

// Zentrale Adapter-Registrierung. Neue Integrationen (Hue, Shelly, …)
// bekommen einen eigenen Ordner mit Adapter nach integrations/adapter.js
// und werden hier ergänzt — mehr ist nicht nötig.
export function createAdapters() {
  return [createTuyaAdapter(), createRingAdapter(), createOnvifAdapter()]
}
