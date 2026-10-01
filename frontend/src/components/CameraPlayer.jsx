import { useEffect, useRef, useState } from 'react'

// Live-Ansicht per WebRTC. `negotiate(offerSdp)` übernimmt das Signaling
// (lokales Gateway oder Ring) und liefert { sdp, close? } — die
// Mediendaten laufen danach direkt.
export function CameraPlayer({ negotiate, name }) {
  const videoRef = useRef(null)
  const [state, setState] = useState('connecting') // connecting | live | error
  const [error, setError] = useState(null)

  useEffect(() => {
    let closed = false
    let closeSession = null
    const pc = new RTCPeerConnection()
    pc.addTransceiver('video', { direction: 'recvonly' })
    pc.addTransceiver('audio', { direction: 'recvonly' })

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0]
      }
    }
    pc.onconnectionstatechange = () => {
      if (closed) return
      if (pc.connectionState === 'connected') setState('live')
      if (pc.connectionState === 'failed') {
        setError('Verbindung zum Stream abgebrochen')
        setState('error')
      }
    }

    ;(async () => {
      try {
        await pc.setLocalDescription(await pc.createOffer())
        // Kurz auf ICE-Kandidaten warten (ein Signaling-Roundtrip, kein Trickle)
        await new Promise((resolve) => {
          if (pc.iceGatheringState === 'complete') return resolve()
          const onChange = () => {
            if (pc.iceGatheringState === 'complete') {
              pc.removeEventListener('icegatheringstatechange', onChange)
              resolve()
            }
          }
          pc.addEventListener('icegatheringstatechange', onChange)
          setTimeout(resolve, 2000)
        })
        const result = await negotiate(pc.localDescription.sdp)
        if (closed) {
          result.close?.()
          return
        }
        closeSession = result.close ?? null
        await pc.setRemoteDescription({ type: 'answer', sdp: result.sdp })
      } catch (err) {
        if (closed) return
        setError(err.message)
        setState('error')
      }
    })()

    return () => {
      closed = true
      pc.close()
      closeSession?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- negotiate ist pro Kamera stabil
  }, [])

  return (
    <div className="camera-player">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
        aria-label={`Live-Bild von ${name}`}
      />
      {state === 'connecting' && <div className="camera-overlay">Verbinde…</div>}
      {state === 'error' && (
        <div className="camera-overlay camera-overlay-error">
          {error ?? 'Kamera momentan nicht erreichbar'}
        </div>
      )}
      {state === 'live' && <span className="camera-live-badge">● Live</span>}
    </div>
  )
}
