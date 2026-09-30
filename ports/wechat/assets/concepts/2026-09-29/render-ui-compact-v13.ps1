$chromeCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browser = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is required to render the compact UI previews.' }

Add-Type -AssemblyName System.Drawing
$source = ([System.Uri]::new((Join-Path $PSScriptRoot 'ui-compact-v13.html'))).AbsoluteUri
$presets = @(
    @{ Width = 320; Height = 568 },
    @{ Width = 360; Height = 640 },
    @{ Width = 390; Height = 844 }
)

foreach ($preset in $presets) {
    $width = $preset.Width
    $height = $preset.Height
    $tempOutput = Join-Path $env:TEMP ("thatbutton-compact-" + [guid]::NewGuid().ToString('N') + '.png')
    $profilePath = Join-Path $env:TEMP ("thatbutton-compact-profile-" + [guid]::NewGuid().ToString('N'))
    $outputPath = Join-Path $PSScriptRoot "ui-compact-v13-${width}x${height}.png"

    try {
        & $browser --headless --disable-gpu --no-sandbox --hide-scrollbars --no-first-run --disable-extensions "--user-data-dir=$profilePath" --force-device-scale-factor=1 --window-size=500,900 "--screenshot=$tempOutput" "${source}?size=$width"
        for ($attempt = 0; $attempt -lt 50 -and -not (Test-Path -LiteralPath $tempOutput -PathType Leaf); $attempt++) {
            Start-Sleep -Milliseconds 100
        }
        if (-not (Test-Path -LiteralPath $tempOutput -PathType Leaf)) { throw "Browser did not render $width x $height." }

        $full = [System.Drawing.Bitmap]::new($tempOutput)
        try {
            if ($full.Width -lt $width -or $full.Height -lt $height) {
                throw "Rendered viewport too small: $($full.Width)x$($full.Height)"
            }
            $crop = $full.Clone(
                [System.Drawing.Rectangle]::new(0, 0, $width, $height),
                [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
            )
            try { $crop.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png) }
            finally { $crop.Dispose() }
        }
        finally { $full.Dispose() }
        Write-Output "Saved $outputPath"
    }
    finally {
        if (Test-Path -LiteralPath $tempOutput) { Remove-Item -LiteralPath $tempOutput -Force }
        $tempRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
        $resolvedProfile = [System.IO.Path]::GetFullPath($profilePath)
        if ($resolvedProfile.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
            [System.IO.Path]::GetFileName($resolvedProfile).StartsWith('thatbutton-compact-profile-') -and
            (Test-Path -LiteralPath $resolvedProfile)) {
            Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
        }
    }
}
