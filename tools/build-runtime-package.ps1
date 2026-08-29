$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $Root "dist"
$Stage = Join-Path $Dist "runtime-stage"
$Zip = Join-Path $Dist "gqa-jira-bug-reporter-helper-runtime.zip"
$Xpi = Join-Path $Dist "gqa-jira-bug-reporter-helper-runtime.xpi"

Push-Location $Root
try {
    node tools\preflight.cjs --release
    if ($LASTEXITCODE -ne 0) { throw "Release preflight failed." }

    if (Test-Path $Stage) { Remove-Item -Recurse -Force $Stage }
    New-Item -ItemType Directory -Force -Path $Stage | Out-Null
    New-Item -ItemType Directory -Force -Path $Dist | Out-Null

    $Files = Get-Content (Join-Path $Root "RUNTIME_FILE_LIST.txt") | Where-Object { $_.Trim() -ne "" }
    foreach ($File in $Files) {
        $Source = Join-Path $Root $File
        if (-not (Test-Path $Source)) { throw "Runtime file missing: $File" }
        $Dest = Join-Path $Stage $File
        $DestDir = Split-Path -Parent $Dest
        if (-not (Test-Path $DestDir)) { New-Item -ItemType Directory -Force -Path $DestDir | Out-Null }
        Copy-Item $Source $Dest
    }

    if (Test-Path $Zip) { Remove-Item -Force $Zip }
    if (Test-Path $Xpi) { Remove-Item -Force $Xpi }
    Compress-Archive -Path (Join-Path $Stage "*") -DestinationPath $Zip -CompressionLevel Optimal
    Copy-Item $Zip $Xpi
    Remove-Item -Recurse -Force $Stage

    Write-Host "Created runtime-only package:"
    Write-Host "  $Zip"
    Write-Host "  $Xpi"
    Write-Host "NOTE: This does not sign the extension."
}
finally {
    Pop-Location
}
