import { createTuyaModule } from './tuya/index.js'
import { createRingModule } from './ring/index.js'
import { createCamerasModule } from './cameras/index.js'

// Zentrale Modul-Registrierung. Neue Geräte-Integrationen (z. B. weitere
// Systeme) werden hier ergänzt und erscheinen automatisch unter /api/<name>
// sowie im Dashboard-Status.
export function createModules(db) {
  return [createTuyaModule(db), createRingModule(db), createCamerasModule(db)]
}
