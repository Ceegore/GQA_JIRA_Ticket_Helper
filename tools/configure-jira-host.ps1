param(
    [Parameter(Mandatory=$true)]
    [string]$HostName
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Manifest = Join-Path $Root "manifest.json"

$HostName = $HostName.Trim()
$HostName = $HostName -replace '^https?://', ''
$HostName = $HostName.TrimEnd('/')

$HostPattern = '^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+atlassian\.net$'
if ($HostName -notmatch $HostPattern) {
    throw "Expected an exact Jira Cloud hostname such as company.atlassian.net, got: $HostName"
}

$Raw = [System.IO.File]::ReadAllText($Manifest)
$Placeholder = 'YOUR-COMPANY.atlassian.net'
$PlaceholderCount = ([regex]::Matches($Raw, [regex]::Escape($Placeholder))).Count
$RequestedCount = ([regex]::Matches($Raw, [regex]::Escape($HostName))).Count

if ($PlaceholderCount -eq 0 -and $RequestedCount -eq 2) {
    Write-Host "manifest.json is already configured for: $HostName"
    exit 0
}

if ($PlaceholderCount -ne 2) {
    throw "Expected exactly two Jira hostname placeholders in manifest.json, found: $PlaceholderCount. Refusing blind replacement."
}

$Updated = $Raw.Replace($Placeholder, $HostName)
try {
    $null = $Updated | ConvertFrom-Json
}
catch {
    throw "Replacement produced invalid manifest JSON. Nothing was written."
}

# Windows PowerShell 5.1 Set-Content -Encoding UTF8 writes a BOM. Node's plain
# JSON.parse does not strip that BOM, so write explicit UTF-8 without BOM.
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Manifest, $Updated, $Utf8NoBom)

Write-Host "Configured Jira hostname in manifest.json: $HostName"
Write-Host "Run: node tools\preflight.cjs"
Write-Host "Then reload the temporary extension in about:debugging and reload Jira."
