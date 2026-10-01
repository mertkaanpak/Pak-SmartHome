// Grundlegende Security-Header für alle Antworten. HTTPS/HSTS kommt im
// Produktivbetrieb über den Reverse Proxy (Caddy/Nginx) dazu.
export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
  next()
}
