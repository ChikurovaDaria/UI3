param([switch]$UsePowerShellServer, [switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path -Parent $PSScriptRoot
$gamePort = if ($env:PORT) { [int]$env:PORT } else { 4186 }
$gameUrl = "http://127.0.0.1:$gamePort/"
$healthUrl = "${gameUrl}__last_hunt_health"
function Test-GameServer {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 1
        return ($response.Headers['X-Last-Hunt-Server'] -eq 'last-hunt-local-v1' -and $response.Content -match '<title>last-hunt-local-v1</title>')
    } catch { return $false }
}
if (Test-GameServer) {
    if (-not $NoBrowser) { Start-Process $gameUrl }
    Write-Output $gameUrl
    exit 0
}
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand -and -not $UsePowerShellServer) {
    $serverPath = Join-Path $PSScriptRoot 'server.mjs'
    $gameProcess = Start-Process -FilePath $nodeCommand.Source -ArgumentList ('"' + $serverPath + '"') -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru
} else {
    $serverPath = Join-Path $PSScriptRoot 'server.ps1'
    $shellPath = Join-Path $PSHOME 'powershell.exe'
    if (-not (Test-Path -LiteralPath $shellPath)) { $shellPath = Join-Path $PSHOME 'pwsh.exe' }
    $serverArgs = '-NoProfile -ExecutionPolicy Bypass -File "' + $serverPath + '" -Port ' + $gamePort
    $gameProcess = Start-Process -FilePath $shellPath -ArgumentList $serverArgs -WorkingDirectory $gameRoot -WindowStyle Hidden -PassThru
}
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    if (Test-GameServer) {
        if (-not $NoBrowser) { Start-Process $gameUrl }
        Write-Output $gameUrl
        exit 0
    }
    if ($gameProcess.HasExited) { throw "The server could not start. Port $gamePort may already be occupied." }
    Start-Sleep -Milliseconds 200
}
if (-not $gameProcess.HasExited) { Stop-Process -Id $gameProcess.Id }
throw 'The game server did not become ready.'
