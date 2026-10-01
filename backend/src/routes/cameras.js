import { Router } from 'express'
import express from 'express'
import { HttpError } from '../errors.js'

// WebRTC-Signaling für Kamera-Live-Streams: der Browser schickt sein
// SDP-Offer, das Backend reicht es (Login-geschützt) an go2rtc weiter
// und liefert die SDP-Answer zurück. Danach fließen die Mediendaten
// direkt zwischen Browser und Gateway.
export function createCamerasRouter({ camerasAdapter, gateway }) {
  const router = Router()

  router.post(
    '/:id/webrtc',
    express.text({ type: ['application/sdp', 'text/plain'], limit: '64kb' }),
    async (req, res) => {
      const camera = camerasAdapter.getCamera(req.params.id)
      if (!camera) throw new HttpError(404, 'Kamera nicht gefunden')
      if (!(await gateway.ping())) {
        throw new HttpError(503, 'Media-Gateway läuft nicht — Kamera-Streams sind deaktiviert')
      }
      const answer = await gateway.webrtcOffer(`cam_${camera.id}`, req.body)
      res.type('application/sdp').send(answer)
    },
  )

  return router
}
