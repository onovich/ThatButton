param(
    [string]$OutputPath = (Join-Path $PSScriptRoot 'hybrid-ui-v12-usability.png')
)

$chromeCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browser = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is required to render the editable v12 UI layer.' }

$pagePath = Join-Path $PSScriptRoot 'ui-usability-v12.html'
$pageUri = ([System.Uri]::new($pagePath)).AbsoluteUri
$tempOutput = Join-Path $env:TEMP ("thatbutton-v12-" + [guid]::NewGuid().ToString('N') + '.png')
$profilePath = Join-Path $env:TEMP ("thatbutton-v12-profile-" + [guid]::NewGuid().ToString('N'))

try {
    & $browser --headless --disable-gpu --no-sandbox --hide-scrollbars --no-first-run --disable-extensions "--user-data-dir=$profilePath" --force-device-scale-factor=1 --window-size=1536,1024 "--screenshot=$tempOutput" $pageUri
    for ($attempt = 0; $attempt -lt 50 -and -not (Test-Path -LiteralPath $tempOutput -PathType Leaf); $attempt++) {
        Start-Sleep -Milliseconds 100
    }
    if (-not (Test-Path -LiteralPath $tempOutput -PathType Leaf)) { throw 'Browser did not create the v12 PNG.' }

    Add-Type -AssemblyName System.Drawing
    $image = [System.Drawing.Image]::FromFile($tempOutput)
    try {
        if ($image.Width -ne 1536 -or $image.Height -ne 1024) {
            throw "Unexpected render size: $($image.Width)x$($image.Height)"
        }
    }
    finally { $image.Dispose() }

    Copy-Item -LiteralPath $tempOutput -Destination $OutputPath -Force
    Write-Output "Saved $OutputPath"
}
finally {
    if (Test-Path -LiteralPath $tempOutput) { Remove-Item -LiteralPath $tempOutput -Force }
    $tempRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
    $resolvedProfile = [System.IO.Path]::GetFullPath($profilePath)
    if ($resolvedProfile.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
        [System.IO.Path]::GetFileName($resolvedProfile).StartsWith('thatbutton-v12-profile-') -and
        (Test-Path -LiteralPath $resolvedProfile)) {
        Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
    }
}
