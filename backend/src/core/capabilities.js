// Zentrales Vokabular der Geräteabstraktion. Das Frontend und der
// Device-Service kennen nur diese Begriffe — nie herstellerspezifische
// Codes (die leben ausschließlich im jeweiligen Integrationsadapter).

export const Capability = {
  OPEN: 'open',
  CLOSE: 'close',
  STOP: 'stop',
  POSITION: 'position',
  SWITCH: 'switch',
  DIM: 'dim',
  STREAM: 'stream',
  SNAPSHOT: 'snapshot',
  MOTION: 'motion',
  DOORBELL: 'doorbell',
  TEMPERATURE: 'temperature',
  BATTERY: 'battery',
  PTZ: 'ptz',
}

export const DeviceType = {
  COVER: 'cover',
  DOORBELL: 'doorbell',
  CAMERA: 'camera',
  UNKNOWN: 'unknown',
}

export const DeviceStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  UNKNOWN: 'UNKNOWN',
  ERROR: 'ERROR',
  CONNECTING: 'CONNECTING',
}

// Welche Capability ein Befehl voraussetzt. Neue Befehle werden hier
// ergänzt und automatisch vom Device-Service geprüft.
export const CommandCapability = {
  open: Capability.OPEN,
  close: Capability.CLOSE,
  stop: Capability.STOP,
  setPosition: Capability.POSITION,
}
