import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

// Verschlüsselung für in der App hinterlegte Zugangsdaten (AES-256-GCM).
// Der Schlüssel liegt als Datei neben der Datenbank (backend/data/ ist
// per .gitignore ausgeschlossen) — so stehen Tokens nie im Klartext in
// der Datenbank und Backups der DB verraten keine Secrets.
export function createSecrets(keyFile) {
  let key
  try {
    key = Buffer.from(readFileSync(keyFile, 'utf8').trim(), 'hex')
    if (key.length !== 32) throw new Error('ungültige Schlüssellänge')
  } catch {
    key = randomBytes(32)
    mkdirSync(dirname(keyFile), { recursive: true })
    writeFileSync(keyFile, key.toString('hex'), { mode: 0o600 })
  }

  return {
    encrypt(plaintext) {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
      return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString('base64')).join('.')
    },

    decrypt(blob) {
      const [iv, tag, encrypted] = blob.split('.').map((part) => Buffer.from(part, 'base64'))
      const decipher = createDecipheriv('aes-256-gcm', key, iv)
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
    },
  }
}
