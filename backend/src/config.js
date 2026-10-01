import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 3001),
  // 0.0.0.0: im (Heim-)Netz erreichbar, z. B. vom Handy — die App selbst
  // ist durch den Login geschützt
  host: process.env.HOST ?? '0.0.0.0',
  dbFile: process.env.DB_FILE ?? './data/smarthome.db',

  tuya: {
    accessId: process.env.TUYA_ACCESS_ID ?? '',
    accessSecret: process.env.TUYA_ACCESS_SECRET ?? '',
    // EU-Rechenzentrum, passend zum "Central Europe Data Center" im Tuya-Projekt
    apiUrl: process.env.TUYA_API_URL ?? 'https://openapi.tuyaeu.com',
  },

  ring: {
    refreshToken: process.env.RING_REFRESH_TOKEN ?? '',
  },

  // Heim-Standort für Sonnenauf-/-untergangs-Automationen
  location:
    process.env.HOME_LAT && process.env.HOME_LON
      ? { lat: Number(process.env.HOME_LAT), lon: Number(process.env.HOME_LON) }
      : null,
}
