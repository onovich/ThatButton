param(
  [string]$Url = "https://onovich.github.io/ThatButton/",
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($DryRun) {
  Write-Host "Online URL: $Url"
  exit 0
}

Start-Process $Url
Write-Host "Opened $Url"
