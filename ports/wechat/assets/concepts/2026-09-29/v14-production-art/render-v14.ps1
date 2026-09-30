$browserCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is required to render v14 art.' }

Add-Type -AssemblyName System.Drawing

function Export-Concept {
    param(
        [string]$Html,
        [string]$Query,
        [string]$Name,
        [int]$Width,
        [int]$Height
    )
    $sourcePath = Join-Path $PSScriptRoot $Html
    $source = ([System.Uri]::new($sourcePath)).AbsoluteUri + $Query
    $tempOutput = Join-Path $env:TEMP ("thatbutton-v14-" + [guid]::NewGuid().ToString('N') + '.png')
    $profilePath = Join-Path $env:TEMP ("thatbutton-v14-profile-" + [guid]::NewGuid().ToString('N'))
    $outputPath = Join-Path $PSScriptRoot $Name
    try {
        $windowWidth = [Math]::Max($Width + 140, 1100)
        $windowHeight = [Math]::Max($Height + 120, 900)
        & $browser --headless --disable-gpu --no-sandbox --hide-scrollbars --no-first-run --disable-extensions "--user-data-dir=$profilePath" --force-device-scale-factor=1 "--window-size=$windowWidth,$windowHeight" "--screenshot=$tempOutput" $source | Out-Null
        for ($attempt = 0; $attempt -lt 50 -and -not (Test-Path -LiteralPath $tempOutput -PathType Leaf); $attempt++) {
            Start-Sleep -Milliseconds 100
        }
        if (-not (Test-Path -LiteralPath $tempOutput -PathType Leaf)) { throw "Browser did not render $Name." }
        $full = [System.Drawing.Bitmap]::new($tempOutput)
        try {
            if ($full.Width -lt $Width -or $full.Height -lt $Height) { throw "Rendered viewport too small: $($full.Width)x$($full.Height)" }
            $crop = $full.Clone([System.Drawing.Rectangle]::new(0, 0, $Width, $Height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
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
            [System.IO.Path]::GetFileName($resolvedProfile).StartsWith('thatbutton-v14-profile-') -and
            (Test-Path -LiteralPath $resolvedProfile)) {
            Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
        }
    }
}

Export-Concept 'gameplay-v14.html' '?size=320&grid=3x3' 'gameplay-v14-320x568.png' 320 568
Export-Concept 'gameplay-v14.html' '?size=360&grid=3x3' 'gameplay-v14-360x640.png' 360 640
Export-Concept 'gameplay-v14.html' '?size=390&grid=3x3' 'gameplay-v14-390x844.png' 390 844
Export-Concept 'gameplay-v14.html' '?size=320&grid=3x3&safe=46' 'gameplay-v14-320x568-safe46.png' 320 568
Export-Concept 'gameplay-v14.html' '?size=360&grid=2x2' 'gameplay-v14-2x2-360x640.png' 360 640
Export-Concept 'gameplay-v14.html' '?size=360&grid=2x3' 'gameplay-v14-2x3-360x640.png' 360 640
Export-Concept 'gameplay-v14.html' '?size=320&grid=3x3&variant=wrong' 'gameplay-v14-wrong-click-320x568.png' 320 568
Export-Concept 'gameplay-v14.html' '?size=320&grid=3x3&variant=critical' 'gameplay-v14-critical-320x568.png' 320 568
Export-Concept 'gameplay-v14.html' '?size=320&grid=3x3&variant=progress-near' 'gameplay-v14-progress-near-320x568.png' 320 568
Export-Concept 'gameplay-v14.html' '?page=buttons' 'buttons-v14-state-board.png' 1000 770
Export-Concept 'flow-v14.html' '?page=home&size=320' 'home-v14-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=home-first&size=320' 'home-v14-first-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=home&size=360' 'home-v14-360x640.png' 360 640
Export-Concept 'flow-v14.html' '?page=home&size=390' 'home-v14-390x844.png' 390 844
Export-Concept 'flow-v14.html' '?page=home&size=320&safe=46' 'home-v14-320x568-safe46.png' 320 568
Export-Concept 'flow-v14.html' '?page=help&size=320' 'help-v14-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=help&size=320&safe=46' 'help-v14-320x568-safe46.png' 320 568
Export-Concept 'flow-v14.html' '?page=settings&size=320' 'settings-v14-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=settings&size=320&safe=46' 'settings-v14-320x568-safe46.png' 320 568
Export-Concept 'flow-v14.html' '?page=upgrade&size=320' 'upgrade-v14-choices-abc-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=upgrade&size=320&safe=46' 'upgrade-v14-choices-abc-320x568-safe46.png' 320 568
Export-Concept 'flow-v14.html' '?page=upgrade&size=360' 'upgrade-v14-choices-abc-360x640.png' 360 640
Export-Concept 'flow-v14.html' '?page=upgrade&size=390' 'upgrade-v14-choices-abc-390x844.png' 390 844
Export-Concept 'flow-v14.html' '?page=upgrade-alt&size=320' 'upgrade-v14-choices-abd-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=upgrade-selected&size=320' 'upgrade-v14-selected-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=result-health&size=320' 'result-v14-health-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=result-health&size=320&safe=46' 'result-v14-health-320x568-safe46.png' 320 568
Export-Concept 'flow-v14.html' '?page=result-health&size=360' 'result-v14-health-360x640.png' 360 640
Export-Concept 'flow-v14.html' '?page=result-health&size=390' 'result-v14-health-390x844.png' 390 844
Export-Concept 'flow-v14.html' '?page=result-time&size=320' 'result-v14-timeout-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=result-time&size=390' 'result-v14-timeout-390x844.png' 390 844
Export-Concept 'flow-v14.html' '?page=resume&size=320' 'resume-v14-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=loading&size=320' 'loading-v14-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=resource-error&size=320' 'resource-error-v14-320x568.png' 320 568
Export-Concept 'flow-v14.html' '?page=states' 'states-v14-board.png' 1060 790
