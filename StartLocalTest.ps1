param(
  [int[]]$Ports = @(5173, 5174, 5175, 5180, 3000, 3001, 4173, 4174, 8000, 8080, 8090),
  [string]$HostName = "127.0.0.1",
  [string]$BasePath = "/",
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

function Quote-PowerShellValue {
  param([string]$Value)
  return "'" + $Value.Replace("'", "''") + "'"
}

function Test-PortAvailable {
  param([int]$Port)

  $listener = $null
  try {
    $address = [System.Net.IPAddress]::Parse("127.0.0.1")
    $listener = [System.Net.Sockets.TcpListener]::new($address, $Port)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($null -ne $listener) {
      $listener.Stop()
    }
  }
}

function Get-EphemeralPort {
  $address = [System.Net.IPAddress]::Parse("127.0.0.1")
  $listener = [System.Net.Sockets.TcpListener]::new($address, 0)
  try {
    $listener.Start()
    return ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
  } finally {
    $listener.Stop()
  }
}

function Test-PortOpen {
  param(
    [string]$Address,
    [int]$Port
  )

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $result = $client.BeginConnect($Address, $Port, $null, $null)
    if (-not $result.AsyncWaitHandle.WaitOne(250)) {
      return $false
    }
    $client.EndConnect($result)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

$candidatePorts = New-Object System.Collections.Generic.List[int]
foreach ($port in $Ports) {
  if (-not $candidatePorts.Contains($port)) {
    $candidatePorts.Add($port)
  }
}
foreach ($port in (5176..5190) + (3002..3010) + (4175..4185) + (8001..8010) + (8081..8099)) {
  if (-not $candidatePorts.Contains($port)) {
    $candidatePorts.Add($port)
  }
}

$selectedPort = $null
foreach ($port in $candidatePorts) {
  if (Test-PortAvailable -Port $port) {
    $selectedPort = $port
    break
  }
}
if ($null -eq $selectedPort) {
  $selectedPort = Get-EphemeralPort
}

if (-not $BasePath.StartsWith("/")) {
  $BasePath = "/" + $BasePath
}
$url = "http://${HostName}:$selectedPort$BasePath"

$node = Get-Command node -ErrorAction SilentlyContinue
$python = Get-Command python -ErrorAction SilentlyContinue

if ($null -ne $node) {
  $runtime = "Node"
  $serverCommand = "& $(Quote-PowerShellValue $node.Source) $(Quote-PowerShellValue (Join-Path $ProjectRoot 'scripts\serve-static.mjs')) --host $(Quote-PowerShellValue $HostName) --port $selectedPort --root $(Quote-PowerShellValue $ProjectRoot)"
} elseif ($null -ne $python) {
  $runtime = "Python"
  $serverCommand = "& $(Quote-PowerShellValue $python.Source) -m http.server $selectedPort --bind $(Quote-PowerShellValue $HostName) --directory $(Quote-PowerShellValue $ProjectRoot)"
} else {
  throw "Neither Node nor Python was found on PATH. Install one of them or open index.html directly in a browser."
}

if ($DryRun) {
  Write-Host "Project root: $ProjectRoot"
  Write-Host "Runtime: $runtime"
  Write-Host "Selected port: $selectedPort"
  Write-Host "URL: $url"
  Write-Host "Server command: $serverCommand"
  exit 0
}

$encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($serverCommand))
$process = Start-Process powershell.exe -ArgumentList @("-NoExit", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", $encodedCommand) -PassThru

$ready = $false
for ($attempt = 0; $attempt -lt 40; $attempt++) {
  if (Test-PortOpen -Address $HostName -Port $selectedPort) {
    $ready = $true
    break
  }
  Start-Sleep -Milliseconds 250
}

if (-not $ready) {
  Write-Warning "Started server process $($process.Id), but the port did not answer yet. Opening the URL anyway."
}

Start-Process $url
Write-Host "Opened $url"
Write-Host "Close the server PowerShell window to stop the local server."
