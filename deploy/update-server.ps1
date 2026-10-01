# ============================================================
#  Pak SmartHome – Update auf dem Server einspielen
#  Holt die neueste Version, baut sie und startet den Dienst neu.
#  Start (PowerShell als Administrator):
#    & C:\Pak-SmartHome\deploy\update-server.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
$InstallDir = 'C:\Pak-SmartHome'
$TaskName   = 'PakSmartHome'

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }

Step 'Hole neueste Version'
# Hart auf den Repo-Stand abgleichen. npm install verändert lokal die
# package-lock.json, was ein normales `git pull` blockieren würde.
# Secrets/Daten (.env, data/, gateway-Binary) sind git-ignoriert und
# bleiben unangetastet.
git -C $InstallDir fetch origin
git -C $InstallDir reset --hard origin/main

Step 'Backend-Abhängigkeiten'
Push-Location "$InstallDir\backend"; npm install --omit=dev; Pop-Location

Step 'Frontend bauen'
Push-Location "$InstallDir\frontend"; npm install; npm run build; Pop-Location

Step 'Dienst neu starten'
# Laufenden Prozess beenden und frisch starten (ohne 2>&1 wegen PS-5.1-Gotcha)
try { Stop-ScheduledTask -TaskName $TaskName } catch {}
Start-Sleep 1
Start-ScheduledTask -TaskName $TaskName

Step 'Fertig – Update ist aktiv.'
Write-Host 'In der App ggf. einmal die Seite neu laden (nach unten ziehen).' -ForegroundColor Green
