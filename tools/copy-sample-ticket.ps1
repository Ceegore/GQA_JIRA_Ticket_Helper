$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Sample = Join-Path $Root "sample-ticket.json"
if (-not (Test-Path $Sample)) {
    throw "sample-ticket.json not found at $Sample"
}
Get-Content -Raw -Encoding UTF8 $Sample | Set-Clipboard
Write-Host "Copied sample-ticket.json to clipboard."
