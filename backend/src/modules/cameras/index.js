import { Router } from 'express'

// Modul für die Überwachungskameras (EseeCloud-Hardware).
// Wird in Schritt 4 implementiert, sobald geklärt ist, ob die Kameras
// ONVIF/RTSP unterstützen — dann laufen die Streams lokal, ohne EseeCloud-Cloud.
export function createCamerasModule(db) {
  const router = Router()

  router.get('/devices', (req, res) => {
    res.status(501).json({ error: 'Kamera-Integration noch nicht implementiert' })
  })

  return {
    name: 'cameras',
    label: 'Kameras',
    router,
    getStatus: () => ({
      configured: false,
      ready: false,
    }),
  }
}
