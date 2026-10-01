# Dauerbetrieb auf dem Server (PC-unabhängig)

Damit die App läuft, auch wenn dein eigener PC aus ist, muss sie auf einem
Rechner laufen, der durchgehend an ist — hier der **mkos-server** (Windows).

## Einmalige Einrichtung — ein einziges Skript

Das Skript [`deploy/setup-server.ps1`](../deploy/setup-server.ps1) erledigt
alles automatisch: Node.js und Git installieren, Projekt holen, bauen,
Media-Gateway (go2rtc) laden, Backend als **Autostart-Dienst** einrichten
(startet nach jedem Hochfahren von allein, auch ohne Anmeldung) und den
öffentlichen HTTPS-Link über Tailscale freischalten.

### So führst du es aus

1. **Auf den Server kommen** — per Remote Desktop (am PC „Remotedesktop­verbindung"
   öffnen, `100.119.247.115` bzw. `mkos-server` eingeben) oder direkt am Gerät.
   Falls Remote Desktop abgewiesen wird, muss es am Server einmal aktiviert
   werden: Einstellungen → System → Remotedesktop → **ein**.
2. Auf dem Server **PowerShell als Administrator** öffnen
   (Startmenü → „PowerShell" → Rechtsklick → „Als Administrator ausführen").
3. Diese zwei Zeilen einfügen und ausführen:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass -Force
   iwr -useb https://raw.githubusercontent.com/mertkaanpak/Pak-SmartHome/main/deploy/setup-server.ps1 | iex
   ```

4. Warten, bis „Fertig!" erscheint. Die Zeile **`https://….ts.net`** ist dein
   neuer, dauerhafter Handy-Link.

### Danach

- App öffnen → **Ersteinrichtung** (Konto anlegen).
- **Mehr → Integrationen**: Tuya-Zugangsdaten eintragen, Ring anmelden,
  Kameras hinzufügen. (Alles in der App — nichts am Server.)
- Den Tailscale-Funnel auf deinem eigenen PC kannst du dann abschalten:
  `tailscale funnel --https=443 off`

## Updates einspielen

Neue Version auf dem Server holen (in der Server-PowerShell):

```powershell
cd C:\Pak-SmartHome; git pull; cd backend; npm install --omit=dev; cd ..\frontend; npm install; npm run build; schtasks /End /TN PakSmartHome; schtasks /Run /TN PakSmartHome
```

## Daten vom bisherigen PC mitnehmen (optional)

Die Rollläden-Steuerung funktioniert sofort neu. Räume, Favoriten, Szenen und
Automationen liegen in `backend/data/smarthome.db` auf dem bisherigen PC.
Wer sie nicht neu anlegen will, kopiert `backend/data/` auf den Server
(**bevor** dort ein Konto angelegt wird). Die Datei `secret.key` gehört dazu,
sonst sind in der App gespeicherte Zugangsdaten nicht mehr lesbar.

## Hinweis zu den Kameras

- **Rollläden (Tuya)** und **Ring** laufen über die Hersteller-Cloud —
  funktionieren vom Server aus überall.
- Die **lokalen EseeCloud-Kameras (JA-D300)** erreicht der Server nur, wenn er
  im selben Heimnetz steht. Steht der Server woanders, ist dafür später die
  WireGuard-Verbindung nötig (siehe Projekt-Roadmap, Phase WireGuard).
