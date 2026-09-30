$browserCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is required.' }

Add-Type -AssemblyName System.Drawing
$html = Join-Path $PSScriptRoot 'gameplay-combo-study.html'

function Export-Combo {
    param([int]$Width, [int]$Height, [int]$Safe, [int]$Count)
    $name = "combo-full-$($Width)x$($Height)-safe$Safe-count$Count.png"
    $source = ([System.Uri]::new($html)).AbsoluteUri + "?size=$Width&grid=3x3&safe=$Safe&combo=$Count&remaining=2.1"
    $tempOutput = Join-Path $env:TEMP ("thatbutton-combo-" + [guid]::NewGuid().ToString('N') + '.png')
    $profile = Join-Path $env:TEMP ("thatbutton-combo-profile-" + [guid]::NewGuid().ToString('N'))
    $output = Join-Path $PSScriptRoot $name
    try {
        $windowWidth = [Math]::Max($Width + 140, 1100)
        $windowHeight = [Math]::Max($Height + 120, 900)
        & $browser --headless --disable-gpu --no-sandbox --hide-scrollbars --no-first-run --disable-extensions "--user-data-dir=$profile" --force-device-scale-factor=1 "--window-size=$windowWidth,$windowHeight" "--screenshot=$tempOutput" $source | Out-Null
        if (-not (Test-Path -LiteralPath $tempOutput)) { throw "Browser did not render $name." }
        $full = [System.Drawing.Bitmap]::new($tempOutput)
        try {
            $crop = $full.Clone([System.Drawing.Rectangle]::new(0, 0, $Width, $Height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try { $crop.Save($output, [System.Drawing.Imaging.ImageFormat]::Png) }
            finally { $crop.Dispose() }
        }
        finally { $full.Dispose() }
        Write-Output $output
    }
    finally {
        if (Test-Path -LiteralPath $tempOutput) { Remove-Item -LiteralPath $tempOutput -Force }
        $tempRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
        $resolvedProfile = [System.IO.Path]::GetFullPath($profile)
        if ($resolvedProfile.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
            [System.IO.Path]::GetFileName($resolvedProfile).StartsWith('thatbutton-combo-profile-') -and
            (Test-Path -LiteralPath $resolvedProfile)) {
            Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
        }
    }
}

Export-Combo 320 568 46 4
Export-Combo 390 844 10 4
Export-Combo 320 568 46 12
Export-Combo 390 844 10 12
Export-Combo 320 568 46 0
