import { HttpError } from '../errors.js'

// Serverseitige Schema-Validierung (Zod) für Request-Bodies.
// Ersetzt req.body durch die geparste (und damit typbereinigte) Fassung.
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const details = result.error.issues.map(
        (issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`,
      )
      return next(new HttpError(400, 'Ungültige Eingabe', details))
    }
    req.body = result.data
    next()
  }
}
