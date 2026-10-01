# Sicherheit

## Authentifizierung (umgesetzt)

- **Ersteinrichtung:** Beim ersten Start (keine Benutzer vorhanden) legt der
  Besitzer über die App Benutzername + Passwort fest (`POST /api/auth/setup`,
  danach dauerhaft gesperrt).
- **Passwörter:** Argon2id (`@node-rs/argon2`, OWASP-Parameter m=19456, t=2,
  p=1), niemals Klartext. Bei unbekanntem Benutzer läuft eine
  Dummy-Verifikation, damit Antwortzeiten keine Benutzernamen verraten.
- **Sessions:** 32-Byte-Zufallstoken, serverseitig nur als SHA-256-Hash in
  SQLite gespeichert; 30 Tage gleitend; Cookie `HttpOnly`, `SameSite=Lax`,
  `Secure` in Produktion. Logout löscht die Session serverseitig.
- **Brute-Force-Schutz:** max. 5 Fehlversuche pro IP+Benutzername in
  15 Minuten, danach 429.
- **Zugriff:** Alle `/api/*`-Routen außer `/api/auth/*` erfordern eine
  gültige Session (401 sonst).
- **Audit-Log:** `audit_logs`-Tabelle für Login/Logout, fehlgeschlagene
  Logins, Gerätebefehle und Metadaten-Änderungen — ohne Secrets.
- **Header:** `X-Content-Type-Options`, `X-Frame-Options=DENY`,
  `Referrer-Policy`, `Permissions-Policy`; `x-powered-by` deaktiviert.
  Kein offenes CORS — Frontend und API laufen hinter demselben Origin
  (Vite-Proxy in Entwicklung, Reverse Proxy in Produktion).
- Weiterhin: Zod-Validierung aller schreibenden Endpunkte, keine
  Stacktraces an Clients, Secrets nur in `backend/.env` (nicht im Git).
- **In der App hinterlegte Zugangsdaten** (Tuya-Keys, Ring-Refresh-Token)
  liegen AES-256-GCM-verschlüsselt in SQLite; der Schlüssel steht in
  `backend/data/secret.key` (git-ignoriert, getrennt von DB-Backups).
  Ring-E-Mail/Passwort werden nur für den Anmeldevorgang an Ring
  durchgereicht und nie gespeichert oder geloggt.

## Geplant

- TOTP-2FA bzw. Passkeys/WebAuthn (Architektur lässt das zu: Auth ist in
  core/auth.js gekapselt)
- Rollen feiner ausgestalten (USER/GUEST mit eingeschränkten Rechten)
- HTTPS über Reverse Proxy (Caddy/Nginx) im Produktivbetrieb; erst dann
  von außen erreichbar machen

## Netzwerkmodell

- Backend läuft auf dem Firmenserver (Standort A); Geräte und Kameras
  hängen im Heimnetz (Standort B).
- Verbindung ausschließlich über WireGuard (FRITZ!Box 5590 Fiber als
  Endpunkt). Kameras bekommen **keine offenen RTSP-Ports ins Internet**;
  Streams laufen über das Backend/Media-Gateway und erfordern Login.

## Secrets

- Niemals in Git, Frontend, Logs oder unverschlüsselten Backups.
- Ring-Refresh-Token und Tuya-Secret bleiben serverseitig; das Frontend
  erhält ausschließlich das einheitliche Gerätemodell.
