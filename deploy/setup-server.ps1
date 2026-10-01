# ============================================================
#  Pak SmartHome – Server-Einrichtung (Windows)
#  Einmal als Administrator auf dem Server ausführen. Richtet das
#  Backend als Autostart-Dienst ein (läuft nach dem Hochfahren von
#  allein, auch ohne Anmeldung) und schaltet den öffentlichen
#  HTTPS-Link über Tailscale frei.
#
#  Start (PowerShell als Administrator):
#    Set-ExecutionPolicy -Scope Process Bypass -Force
#    .\setup-server.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
$RepoUrl   = 'https://github.com/mertkaanpak/Pak-SmartHome.git'
$InstallDir = 'C:\Pak-SmartHome'
$TaskName  = 'PakSmartHome'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Have($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

# --- Administrator prüfen ---
$admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
    ).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
if (-not $admin) { throw 'Bitte diese PowerShell als Administrator starten.' }

# --- Node.js ---
Step 'Prüfe Node.js'
if (-not (Have node)) {
    if (Have winget) {
        Write-Host 'Node.js wird installiert (winget) ...'
        winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
        $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                    [Environment]::GetEnvironmentVariable('Path','User')
    } else {
        throw 'Node.js fehlt und winget ist nicht verfügbar. Bitte Node.js LTS von https://nodejs.org installieren und das Skript erneut ausführen.'
    }
}
Write-Host ("Node " + (node --version))

# --- Git ---
Step 'Prüfe Git'
if (-not (Have git)) {
    if (Have winget) {
        winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
        $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' +
                    [Environment]::GetEnvironmentVariable('Path','User')
    } else {
        throw 'Git fehlt und winget ist nicht verfügbar. Bitte Git von https://git-scm.com installieren.'
    }
}

# --- Projekt holen/aktualisieren ---
Step "Hole Projekt nach $InstallDir"
if (Test-Path "$InstallDir\.git") {
    git -C $InstallDir pull --ff-only
} else {
    git clone $RepoUrl $InstallDir
}

# --- Abhängigkeiten + Frontend-Build ---
Step 'Installiere Abhängigkeiten (Backend)'
Push-Location "$InstallDir\backend"; npm install --omit=dev; Pop-Location
Step 'Baue Frontend'
Push-Location "$InstallDir\frontend"; npm install; npm run build; Pop-Location

# --- .env anlegen (falls nicht vorhanden) ---
Step 'Prüfe Konfiguration (.env)'
$envFile = "$InstallDir\backend\.env"
if (-not (Test-Path $envFile)) {
    Copy-Item "$InstallDir\backend\.env.example" $envFile
    Write-Host 'backend\.env aus Vorlage erstellt. Tuya/Ring/Kameras richtest du bequem in der App ein (Mehr -> Integrationen).' -ForegroundColor Yellow
}

# --- go2rtc (Media-Gateway für Kameras) ---
Step 'Prüfe Media-Gateway (go2rtc)'
$go2 = "$InstallDir\gateway\go2rtc.exe"
if (-not (Test-Path $go2)) {
    New-Item -ItemType Directory -Force "$InstallDir\gateway" | Out-Null
    $zip = "$InstallDir\gateway\go2rtc_win64.zip"
    Invoke-WebRequest 'https://github.com/AlexxIT/go2rtc/releases/latest/download/go2rtc_win64.zip' -OutFile $zip
    Expand-Archive $zip -DestinationPath "$InstallDir\gateway" -Force
    Remove-Item $zip
}

# --- Autostart-Dienst (Aufgabenplanung, Start als SYSTEM beim Hochfahren) ---
# Hinweis: kein `schtasks ... 2>&1` — in PowerShell 5.1 würde die
# Stderr-Umleitung eines nativen Befehls bei ErrorActionPreference=Stop
# fälschlich abbrechen. Register-ScheduledTask -Force überschreibt ohnehin.
Step 'Richte Autostart ein'
$node = (Get-Command node).Source
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
$action  = New-ScheduledTaskAction -Execute $node -Argument 'src\server.js' -WorkingDirectory "$InstallDir\backend"
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

# --- Öffentlichen HTTPS-Link einschalten ---
Step 'Schalte öffentlichen Zugriff frei (Tailscale Funnel)'
if (Have tailscale) {
    try { tailscale funnel --bg 3001 } catch { Write-Host "Funnel konnte nicht automatisch gesetzt werden: $_" -ForegroundColor Yellow }
    Start-Sleep 2
    tailscale funnel status
} else {
    Write-Host 'Tailscale nicht gefunden – bitte Tailscale installieren und `tailscale funnel --bg 3001` ausführen.' -ForegroundColor Yellow
}

Step 'Fertig!'
Write-Host 'Das Backend läuft jetzt als Autostart-Dienst und startet nach jedem Neustart von allein.' -ForegroundColor Green
Write-Host 'Deinen festen Handy-Link zeigt die Zeile "https://....ts.net" oben an.' -ForegroundColor Green
Write-Host 'Danach in der App: Ersteinrichtung -> dann Mehr -> Integrationen (Tuya, Ring, Kameras).' -ForegroundColor Green
