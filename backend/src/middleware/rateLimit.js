// Brute-Force-Schutz für den Login: wenige Versuche pro IP+Benutzername,
// danach vorübergehend 429. Bewusst im Speicher gehalten — bei einem
// Single-Instance-Server ausreichend und ohne weitere Abhängigkeit.
export function createLoginLimiter({ max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map() // key -> { count, resetAt }

  function keyFor(req) {
    return `${req.ip}|${req.body?.username ?? ''}`
  }

  function middleware(req, res, next) {
    const now = Date.now()
    // Abgelaufene Einträge bei Gelegenheit entsorgen
    if (attempts.size > 1000) {
      for (const [key, entry] of attempts) if (entry.resetAt < now) attempts.delete(key)
    }
    const entry = attempts.get(keyFor(req))
    if (entry && entry.resetAt > now && entry.count >= max) {
      const minutes = Math.ceil((entry.resetAt - now) / 60_000)
      return res.status(429).json({
        error: `Zu viele Anmeldeversuche — bitte in ${minutes} Min. erneut versuchen`,
      })
    }
    next()
  }

  middleware.recordFailure = (req) => {
    const key = keyFor(req)
    const now = Date.now()
    const entry = attempts.get(key)
    if (entry && entry.resetAt > now) entry.count += 1
    else attempts.set(key, { count: 1, resetAt: now + windowMs })
  }

  middleware.reset = (req) => attempts.delete(keyFor(req))

  return middleware
}
