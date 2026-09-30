# Architektur

## Schichten

```
frontend/  React + Vite, PWA, deutsch, mobile-first
             │  spricht ausschließlich die Backend-API an
backend/
  src/routes/        HTTP-Schicht: /api/devices, /api/integrations, /api/system
  src/core/          Service-Schicht: Geräteabstraktion, Capabilities, Timeouts
  src/integrations/  Adapter: ein Ordner pro Hersteller/Protokoll
  src/middleware/    Fehlerbehandlung, Zod-Validierung
  src/db.js          SQLite (better-sqlite3) + Migrationssystem (PRAGMA user_version)
```

## Einheitliches Gerätemodell

Jedes Gerät wird — unabhängig vom Hersteller — als `Device` dargestellt
(Definition: `backend/src/integrations/adapter.js`):

- `id` = `"<integration>:<externalId>"` (global eindeutig)
- `type` (cover, doorbell, camera, …), `manufacturer`, `integration`
- `status`: ONLINE, OFFLINE, UNKNOWN, ERROR, CONNECTING
- `capabilities`: open, close, stop, position, stream, snapshot, motion,
  doorbell, battery, ptz, … (`backend/src/core/capabilities.js`)
- `state`: capability-bezogener Zustand, z. B. `{ position: 50 }`
- `room`, `favorite`, Name-Override: kommen aus der Tabelle `device_meta`,
  nicht vom Hersteller

Das Frontend rendert Bedienelemente **allein anhand der Capabilities**
(`DeviceCard` → `CoverControls`); welcher Adapter dahintersteckt, ist der
Oberfläche egal.

## Adapterprinzip

Ein Adapter kapselt sämtliche herstellerspezifische Logik und implementiert:

```
name, label, manufacturer, configured
getDevices()                          → Device[]
executeCommand(externalId, cmd, params)
healthCheck()                         → { status, message? }
router (optional)                     → Diagnose-Routen unter /api/integrations/<name>
```

Befehle sind hersteller­neutral (`open`, `close`, `stop`, `setPosition`);
die Übersetzung in DP-Codes/Protokollaufrufe passiert im Adapter
(z. B. `setPosition` → Tuya `percent_control`).

Neue Integration = neuer Ordner unter `integrations/` + ein Eintrag in
`integrations/index.js`. Sonst keine Änderung am System.

## Resilienz

- Jede externe Anfrage läuft gegen ein Timeout (`core/async.js`, 10 s).
- Fällt eine Integration aus, liefert `GET /api/devices` weiterhin die
  Geräte der übrigen Adapter plus einen Fehler-Eintrag pro Integration.
- Bekannte Fehlercodes werden in verständliche deutsche Meldungen übersetzt
  (z. B. Tuya 28841002 → „Probeabo abgelaufen…"); rohe Stacktraces erreichen
  nie das Frontend.

## Datenfluss eines Befehls

```
Tippen auf ▲  →  POST /api/devices/tuya:<id>/commands {command:"open"}
  → Zod-Validierung → deviceService prüft Capability
  → Tuya-Adapter übersetzt in {code:"control", value:"open"}
  → Tuya Cloud API → Rollladen fährt
  → Frontend lädt nach ~1,5 s den echten Zustand nach (kein Optimistic UI)
```

## Geplant (spätere Phasen)

- Auth/Benutzer (Phase 3), Events + Timeline (9), Szenen (10),
  Push (11), Automationen (12) — Tabellen kommen als neue Migrationen dazu.
- Echtzeit: WebSockets oder SSE statt Polling, sobald Events existieren.
- Kamerastreaming: RTSP → go2rtc/MediaMTX → WebRTC (HLS als Fallback);
  Streams nur hinter Login, nie direkt ins Internet.
- Netzwerk: Backend am Standort A erreicht Geräte am Standort B über
  WireGuard (FRITZ!Box 5590 als Endpunkt).
