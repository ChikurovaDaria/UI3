param([int]$Port = 4186)
$ErrorActionPreference = 'Stop'
if ($Port -lt 1 -or $Port -gt 65535) { throw 'Invalid port' }
$gameRoot = [IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$rootPrefix = $gameRoot.TrimEnd('\') + '\'
$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'; '.css' = 'text/css; charset=utf-8'
    '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'; '.md' = 'text/plain; charset=utf-8'
    '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.jpg' = 'image/jpeg'
    '.webp' = 'image/webp'; '.wav' = 'audio/wav'; '.mp3' = 'audio/mpeg'
}
$gameListener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
$gameListener.Start()
Write-Output "The Last Hunt: http://127.0.0.1:$Port/"
try {
    while ($true) {
        $httpClient = $gameListener.AcceptTcpClient()
        $httpClient.ReceiveTimeout = 3000
        $httpClient.SendTimeout = 10000
        $reader = $null
        try {
            $networkStream = $httpClient.GetStream()
            $reader = [IO.StreamReader]::new($networkStream, [Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            if (-not $requestLine) { continue }
            $requestParts = $requestLine.Split(' ')
            if ($requestParts.Count -lt 2) { continue }
            $method = $requestParts[0]
            $headerCount = 0
            while (($headerLine = $reader.ReadLine()) -and $headerCount -lt 100) { $headerCount++ }
            $status = '200 OK'
            $contentType = 'text/plain; charset=utf-8'
            $body = [Text.Encoding]::UTF8.GetBytes('File unavailable')
            if ($method -notin @('GET', 'HEAD')) {
                $status = '405 Method Not Allowed'
            } else {
                try {
                    $urlPath = [Uri]::UnescapeDataString(($requestParts[1].Split('?'))[0])
                    if ($urlPath -eq '/__last_hunt_health') {
                        $contentType = 'text/html; charset=utf-8'
                        $body = [Text.Encoding]::UTF8.GetBytes('<title>last-hunt-local-v1</title>')
                    } else {
                        if (-not $urlPath.StartsWith('/') -or $urlPath.Contains('\') -or $urlPath.Contains(':') -or $urlPath.Contains([char]0)) { throw 'Forbidden' }
                        $relativeParts = $urlPath.TrimStart('/').Split('/')
                        foreach ($segment in $relativeParts) { if ($segment.StartsWith('.')) { throw 'Forbidden' } }
                        $filePath = [IO.Path]::GetFullPath((Join-Path $gameRoot $urlPath.TrimStart('/')))
                        if ($filePath -eq $gameRoot) { $filePath = Join-Path $gameRoot 'index.html' }
                        if (-not $filePath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase)) { throw 'Forbidden' }
                        $checkPath = $gameRoot
                        foreach ($segment in $relativeParts) {
                            if (-not $segment) { continue }
                            $checkPath = Join-Path $checkPath $segment
                            if ((Test-Path -LiteralPath $checkPath) -and ((Get-Item -LiteralPath $checkPath -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Forbidden' }
                        }
                        if (Test-Path -LiteralPath $filePath -PathType Container) { $filePath = Join-Path $filePath 'index.html' }
                        if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                            $status = '404 Not Found'
                        } else {
                            $body = [IO.File]::ReadAllBytes($filePath)
                            $extension = [IO.Path]::GetExtension($filePath).ToLowerInvariant()
                            $contentType = if ($mimeTypes.ContainsKey($extension)) { $mimeTypes[$extension] } else { 'application/octet-stream' }
                        }
                    }
                } catch { $status = '403 Forbidden' }
            }
            $headers = "HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-store`r`nX-Content-Type-Options: nosniff`r`nX-Last-Hunt-Server: last-hunt-local-v1`r`n`r`n"
            $headerBytes = [Text.Encoding]::ASCII.GetBytes($headers)
            $networkStream.Write($headerBytes, 0, $headerBytes.Length)
            if ($method -ne 'HEAD') { $networkStream.Write($body, 0, $body.Length) }
            $networkStream.Flush()
        } catch {
            # A disconnected browser request must not stop the local server.
        } finally {
            if ($reader) { $reader.Dispose() }
            $httpClient.Dispose()
        }
    }
} finally { $gameListener.Stop() }
