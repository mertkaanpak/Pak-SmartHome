import { IntegrationError } from '../../errors.js'

// Adapter für die Überwachungskameras (EseeCloud-Hardware, lokal per
// ONVIF/RTSP — bewusst nicht über die EseeCloud-Cloud). Wird in Phase 6
// implementiert, sobald das Kameramodell bekannt ist und der ONVIF/RTSP-
// Support geprüft wurde. Streaming-Architektur: RTSP -> Media-Gateway
// (go2rtc/MediaMTX) -> WebRTC/HLS -> Browser.
export function createOnvifAdapter() {
  return {
    name: 'onvif',
    label: 'Kameras',
    manufacturer: 'ONVIF/RTSP',
    configured: false,

    async getDevices() {
      throw new IntegrationError('Kamera-Integration noch nicht implementiert')
    },

    async executeCommand() {
      throw new IntegrationError('Kamera-Integration noch nicht implementiert')
    },

    async healthCheck() {
      return { status: 'not_configured' }
    },
  }
}
