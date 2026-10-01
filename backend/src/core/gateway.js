import { spawn } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { createLogger } from '../logger.js'
import { withTimeout } from './async.js'
import { IntegrationError } from '../errors.js'

const GO2RTC_API = 'http://127.0.0.1:1984'

// Verwaltet das Media-Gateway (go2rtc): startet die Binary als
// Kindprozess, registriert Kamera-Streams über dessen API und reicht
// WebRTC-Signaling (SDP) durch. Browser und Kameras sprechen nie direkt
// mit der go2rtc-API — nur das Backend (Login-geschützt).
export function createGateway({ binaryPath, configPath }) {
  const log = createLogger('gateway')
  let child = null

  async function api(path, options = {}) {
    const res = await withTimeout(
      fetch(`${GO2RTC_API}${path}`, options),
      8000,
      'Media-Gateway antwortet nicht',
    ).catch((err) => {
      if (err instanceof IntegrationError) throw err
      throw new IntegrationError('Media-Gateway nicht erreichbar')
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new IntegrationError('Media-Gateway meldet einen Fehler', {
        status: res.status,
        body: body.slice(0, 200),
      })
    }
    return res
  }

  return {
    available() {
      return existsSync(binaryPath)
    },

    running() {
      return Boolean(child && child.exitCode === null)
    },

    // Tatsächliche Erreichbarkeit der Gateway-API (robust gegenüber
    // Neustarts, bei denen ein älterer go2rtc-Prozess weiterläuft)
    async ping() {
      try {
        await api('/api/streams')
        return true
      } catch {
        return false
      }
    },

    start() {
      if (!this.available()) {
        log.warn('go2rtc-Binary nicht gefunden — Kamera-Streams deaktiviert', {
          binaryPath,
        })
        return
      }
      if (this.running()) return
      // Live-Config aus der Vorlage anlegen (git-ignoriert, da go2rtc
      // Kamera-Zugangsdaten hineinschreibt)
      if (!existsSync(configPath)) {
        const example = configPath.replace(/\.yaml$/, '.example.yaml')
        if (existsSync(example)) copyFileSync(example, configPath)
      }
      child = spawn(binaryPath, ['-config', configPath], { stdio: ['ignore', 'pipe', 'pipe'] })
      child.stdout.on('data', (d) => log.debug('go2rtc', { out: String(d).trim() }))
      child.stderr.on('data', (d) => log.debug('go2rtc', { err: String(d).trim() }))
      child.on('exit', (code) => {
        log.warn('go2rtc beendet', { code })
        child = null
      })
      log.info('go2rtc gestartet', { pid: child.pid })
    },

    stop() {
      child?.kill()
      child = null
    },

    // Stream anlegen/aktualisieren (Quelle enthält Zugangsdaten — sie
    // bleibt zwischen Backend und go2rtc auf 127.0.0.1)
    async setStream(name, source) {
      await api(
        `/api/streams?name=${encodeURIComponent(name)}&src=${encodeURIComponent(source)}`,
        { method: 'PUT' },
      )
    },

    async removeStream(name) {
      await api(`/api/streams?src=${encodeURIComponent(name)}`, { method: 'DELETE' }).catch(
        () => {},
      )
    },

    // WebRTC-Signaling (WHEP): SDP-Offer des Browsers einreichen,
    // SDP-Answer zurückgeben. Die Mediendaten laufen danach direkt.
    async webrtcOffer(streamName, offerSdp) {
      const res = await api(`/api/webrtc?src=${encodeURIComponent(streamName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offerSdp,
      })
      return res.text()
    },
  }
}
