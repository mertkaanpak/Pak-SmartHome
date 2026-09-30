// Schnittstelle, die jeder Integrationsadapter implementiert.
// Herstellerspezifische Logik (API-Codes, Protokolle, Tokens) bleibt
// vollständig im Adapter — der Rest des Systems arbeitet nur mit dem
// einheitlichen Gerätemodell und den Capabilities aus core/capabilities.js.
//
// @typedef {object} Device            Einheitliches Gerätemodell
// @property {string} id               Global eindeutig: "<integration>:<externalId>"
// @property {string} externalId       ID beim Hersteller
// @property {string} name             Anzeigename (vom Hersteller; überschreibbar per Metadaten)
// @property {string|null} room        Raumzuordnung (kommt aus device_meta, nicht vom Adapter)
// @property {string} type             DeviceType (cover, doorbell, camera, …)
// @property {string} manufacturer     z. B. "Tuya", "Ring"
// @property {string} integration      Adapter-Name
// @property {string} status           DeviceStatus (ONLINE, OFFLINE, …)
// @property {string|null} lastSeen    ISO-Zeitpunkt, falls bekannt
// @property {string[]} capabilities   Capability-Liste
// @property {object} state            Capability-bezogener Zustand, z. B. { position: 50 }
//
// @typedef {object} Adapter
// @property {string} name             Eindeutiger Kurzname (URL-tauglich), z. B. "tuya"
// @property {string} label            Deutscher Anzeigename fürs Frontend
// @property {string} manufacturer
// @property {boolean} configured      Sind die nötigen Zugangsdaten vorhanden?
// @property {() => Promise<Device[]>} getDevices
// @property {(externalId: string, command: string, params?: object) => Promise<void>} executeCommand
// @property {() => Promise<{status: 'connected'|'not_configured'|'error', message?: string}>} healthCheck
// @property {import('express').Router} [router]  Optionale Diagnose-Routen unter /api/integrations/<name>
