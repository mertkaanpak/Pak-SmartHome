# SmartHome Kontrollzentrum

Eigene Web-App zur zentralen Steuerung von SmartHome-Geräten verschiedener
Hersteller: Rollläden (Tuya/SmartLife), Türklingel (Ring) und
Überwachungskameras (EseeCloud-Hardware, lokal per ONVIF/RTSP).
Mobile-first PWA, Oberfläche auf Deutsch.

## Architektur

```
Smartphone / Browser
        ↓
React-Frontend (Vite, PWA)          frontend/
        ↓
Backend-API (Express)               backend/src/routes/
        ↓
Device-Service (Geräteabstraktion)  backend/src/core/
        ↓
Integrationsadapter                 backend/src/integrations/
        ↓
Tuya Cloud · Ring · ONVIF/RTSP · spätere Systeme
```

- Das Frontend kennt **nur das einheitliche Gerätemodell** (Capabilities wie
  `open`, `close`, `stop`, `position`, `stream`, …) — nie Hersteller-APIs.
- Jede Integration ist ein **Adapter** nach der Schnittstelle in
  [`backend/src/integrations/adapter.js`](backend/src/integrations/adapter.js)
  und wird in `integrations/index.js` registriert.
- Benutzer-Metadaten (Raum, Favorit, eigener Name) liegen in SQLite
  (`device_meta`), Schemaänderungen laufen über das Migrationssystem in
  [`backend/src/db.js`](backend/src/db.js).
- Später: Backend auf dem Firmenserver (Standort A), Geräte im Heimnetz
  (Standort B), Verbindung per WireGuard über die FRITZ!Box 5590 Fiber.
  Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
  [docs/SECURITY.md](docs/SECURITY.md).

## API (Auszug)

| Route | Zweck |
| --- | --- |
| `GET /api/devices` | Einheitliche Geräteliste aller Integrationen (`?fresh=1` umgeht den Cache) |
| `POST /api/devices/:id/commands` | Befehl ausführen: `{command: "open"\|"close"\|"stop"}` oder `{command: "setPosition", params: {percent}}` |
| `PATCH /api/devices/:id` | Metadaten: `{room, favorite, name}` |
| `GET /api/integrations` | Status + Live-Verbindungstest aller Integrationen |
| `GET /api/integrations/tuya/devices/:id/functions` | Diagnose: rohe Tuya-DP-Codes |
| `GET /api/system/health` | Systemstatus (Backend, Datenbank, Integrationen) |

## Entwicklung

```bash
# Backend (Port 3001)
cd backend
cp .env.example .env   # einmalig, Zugangsdaten eintragen
npm install
npm run dev

# Frontend (Port 5173, proxied /api ans Backend)
cd frontend
npm install
npm run dev

# Tests (Backend)
cd backend && npm test
```

## Environment-Variablen

Siehe [`backend/.env.example`](backend/.env.example). Echte Zugangsdaten nur
in `backend/.env` (nicht im Git) — niemals im Frontend oder in Logs.

| Variable | Zweck |
| --- | --- |
| `PORT`, `DB_FILE`, `LOG_LEVEL` | Server, SQLite-Pfad, Loglevel (debug/info/warn/error) |
| `TUYA_ACCESS_ID`, `TUYA_ACCESS_SECRET`, `TUYA_API_URL` | Tuya-Cloud-Projekt (EU: `openapi.tuyaeu.com`) |
| `RING_REFRESH_TOKEN` | Ring (erzeugt per `npx -p ring-client-api ring-auth-cli`) |

## Projektphasen (Stand)

| Phase | Inhalt | Status |
| --- | --- | --- |
| 1 | Analyse & Stabilisierung (Fehlerbehandlung, Logging, Validierung, Tests) | ✅ |
| 2 | Geräteabstraktion & Adapter-Architektur | ✅ |
| 3 | Benutzer, Auth, Security (Argon2id, Sessions, Rate-Limit, Audit-Log) | ✅ |
| 4 | Tuya real steuern | ✅ funktionierte im Juli — **Tuya-IoT-Core-Abo abgelaufen, im Tuya-Portal kostenlos verlängern** |
| 5 | Ring | 🔶 Adapter + In-App-Anmeldung fertig (Mehr → Integrationen); Live-Test wartet auf deine Ring-Anmeldung |
| 6 | Kamerastreaming (EseeCloud/RTSP → go2rtc → WebRTC) | 🔶 fertig gebaut; Live-Test braucht Kamera-IP + App-Test im Heimnetz (Modell JA-D300) |
| 7 | Dashboard mit echten Daten | 🔶 Rollläden fertig, Rest folgt mit den Integrationen |
| 8 | Räume & Favoriten | 🔶 Backend fertig (`PATCH /api/devices/:id`), Verwaltungs-UI folgt |
| 9 | Events & Timeline (SSE-Live-Updates, Tagesgruppierung, Filter) | ✅ |
| 10 | Szenen (Editor, Vorlagen, Teilerfolgs-Ergebnis) | ✅ |
| 12 | Automationen (Uhrzeit/Sonnenauf-/-untergang ± Offset, Wochentage → Szene; Verwaltung komplett in der App) | ✅ |
| 11, 13–16 | Push, WireGuard, Health-Feinschliff, Docker, UI-Feinschliff | ⬜ |

## Media-Gateway (Kamera-Streams)

Live-Streams laufen über [go2rtc](https://github.com/AlexxIT/go2rtc)
(Kamera → go2rtc → WebRTC → Browser, lokal ohne Hersteller-Cloud).
Einrichtung: `go2rtc_win64.zip` von den offiziellen GitHub-Releases laden
und `go2rtc.exe` nach `gateway/` entpacken — das Backend startet es
automatisch und verwaltet die Streams (Kameras hinzufügen: in der App
unter Mehr → Integrationen → Kameras). `gateway/go2rtc.yaml` ist
git-ignoriert, weil go2rtc dort Kamera-Zugangsdaten persistiert.

## Troubleshooting

- **„Tuya-Probeabo abgelaufen"**: iot.tuya.com → Cloud → Cloud Services →
  IoT Core → Subscription → *Extend Trial Period* (kostenlos), danach im
  Dashboard aktualisieren.
- **Backend startet nicht**: `backend/.env` vorhanden? `npm install` gelaufen?
- **Frontend zeigt „Backend nicht erreichbar"**: Backend auf Port 3001 gestartet?
