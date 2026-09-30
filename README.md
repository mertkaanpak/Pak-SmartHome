# SmartHome Kontrollzentrum

Eigene Web-App zur zentralen Steuerung von Rollläden (Tuya/SmartLife),
Türklingel (Ring) und Überwachungskameras (EseeCloud-Hardware, lokal per
ONVIF/RTSP).

## Architektur

- **Backend** (`backend/`): Node.js + Express, SQLite (better-sqlite3).
  Läuft später auf dem Firmenserver (Standort A).
- **Frontend** (`frontend/`): React + Vite, mobile-first PWA (deutsch).
- Geräte hängen im Heimnetz (Standort B); Verbindung Firmenserver ↔ Heimnetz
  über WireGuard-VPN (FRITZ!Box 5590 Fiber als Endpunkt).

## Module

Jede Integration ist ein eigenes Modul unter `backend/src/modules/<name>/` und
wird in `backend/src/modules/index.js` registriert. Ein Modul liefert einen
Express-Router (gemountet unter `/api/<name>`) und einen Status für das
Dashboard. Neue Systeme lassen sich so später einfach ergänzen.

| Modul     | System            | Anbindung                          |
| --------- | ----------------- | ---------------------------------- |
| `tuya`    | Rollläden         | Tuya Cloud API (EU-Rechenzentrum)  |
| `ring`    | Türklingel        | ring-client-api (inoffiziell)      |
| `cameras` | Überwachungskameras | ONVIF/RTSP lokal (geplant)       |

## Entwicklung starten

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
```

## Projektschritte

1. ✅ Projektstruktur (Backend + Frontend-Grundgerüst)
2. ⬜ Tuya-Integration (Rollläden steuern)
3. ⬜ Ring-Integration (Klingel-Status/Benachrichtigungen)
4. ⬜ Kamera-Anbindung (ONVIF/RTSP-Check, Live-Stream)
5. ⬜ Gemeinsames Dashboard
6. ⬜ WireGuard Firmenserver ↔ FRITZ!Box
7. ⬜ Login/Passwortschutz
