# Starts the responder client against the services on the Univates VM instead of localhost.
# Uses its own data folder, so the local SQLite of the VM and of localhost never mix.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\start-client-vm.ps1
param(
    [string]$VmHost = '177.44.248.72'
)

$root = Split-Path -Parent $PSScriptRoot

$env:MEDICALFIELD_IDENTITY_URL = "http://${VmHost}:8081"
$env:MEDICALFIELD_CLINICAL_URL = "http://${VmHost}:8080"
$env:MEDICALFIELD_DATA_DIR = "$env:APPDATA\medicalfield-client-vm"
New-Item -ItemType Directory -Force $env:MEDICALFIELD_DATA_DIR | Out-Null

Set-Location "$root\client"
npm start
