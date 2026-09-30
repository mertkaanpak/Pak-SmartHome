import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 3001),
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
}
