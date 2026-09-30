# Sicherheit

## Aktueller Stand (ehrlich)

Die App hat **noch kein Login** (kommt in Phase 3) und darf deshalb
**nur im lokalen Netz bzw. hinter dem VPN** betrieben werden — nicht
öffentlich erreichbar machen.

Bereits umgesetzt:

- Zugangsdaten ausschließlich in `backend/.env` (per `.gitignore` vom Git
  ausgeschlossen); `x-powered-by` deaktiviert; serverseitige
  Zod-Validierung aller schreibenden Endpunkte; keine Stacktraces oder
  rohen API-Fehler in Antworten; Secrets tauchen nicht in Logs auf.

## Geplant (Phase 3 ff.)

- Login mit bcrypt/Argon2id-Passwort-Hashes, sichere Sessions
  (HttpOnly, SameSite) bzw. Tokens; Vorbereitung für TOTP-2FA/Passkeys
- Rollen (ADMIN/USER/GUEST), Audit-Log sicherheitsrelevanter Aktionen
- Rate Limiting/Brute-Force-Schutz, Security-Header (Helmet),
  restriktives CORS (aktuell offen für die lokale Entwicklung)
- HTTPS über Reverse Proxy (Caddy/Nginx) im Produktivbetrieb

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
