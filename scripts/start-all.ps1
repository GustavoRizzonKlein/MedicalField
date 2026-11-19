# Starts the three services and the portal, each in its own PowerShell window (local development).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
$root = Split-Path -Parent $PSScriptRoot

if (-not $env:JAVA_HOME) {
    Write-Warning 'JAVA_HOME is not set; the clinical service needs JDK 21.'
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\identity-service'; npm start"
Start-Sleep -Seconds 3   # the identity service creates the JWT keys the other services read
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\clinical-service'; .\gradlew.bat bootRun"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\document-service'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8082"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root\portal'; npm run dev"

Write-Host 'Started: identity :8081, clinical :8080, documents :8082, portal http://localhost:5173'
Write-Host 'Client: cd client; npm start'
