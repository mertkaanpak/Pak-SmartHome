import { Router } from 'express'
import { z } from 'zod'
import { SESSION_COOKIE, sessionCookieOptions } from '../core/auth.js'
import { validateBody } from '../middleware/validate.js'
import { createLoginLimiter } from '../middleware/rateLimit.js'

const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Benutzername: mindestens 3 Zeichen')
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Benutzername: nur Buchstaben, Zahlen, . _ -'),
  password: z.string().min(8, 'Passwort: mindestens 8 Zeichen').max(200),
})

export function createAuthRouter(auth) {
  const router = Router()
  const limiter = createLoginLimiter()

  // Öffentlich: sagt dem Frontend, ob Ersteinrichtung nötig bzw. wer angemeldet ist
  router.get('/status', (req, res) => {
    const user = auth.verifySession(req.cookies?.[SESSION_COOKIE])
    res.json({
      needsSetup: auth.needsSetup(),
      authenticated: Boolean(user),
      user: user ?? undefined,
    })
  })

  // Ersteinrichtung (nur solange kein Benutzer existiert)
  router.post('/setup', validateBody(credentialsSchema), async (req, res) => {
    const { token, user } = await auth.setup(req.body.username, req.body.password)
    res.cookie(SESSION_COOKIE, token, sessionCookieOptions())
    res.json({ user })
  })

  router.post('/login', limiter, validateBody(credentialsSchema), async (req, res) => {
    try {
      const { token, user } = await auth.login(req.body.username, req.body.password)
      limiter.reset(req)
      res.cookie(SESSION_COOKIE, token, sessionCookieOptions())
      res.json({ user })
    } catch (err) {
      if (err.status === 401) limiter.recordFailure(req)
      throw err
    }
  })

  router.post('/logout', (req, res) => {
    auth.logout(req.cookies?.[SESSION_COOKIE])
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    res.json({ ok: true })
  })

  return router
}
