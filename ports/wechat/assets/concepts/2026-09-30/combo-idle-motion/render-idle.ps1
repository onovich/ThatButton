$browserCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is required.' }

Add-Type -AssemblyName System.Drawing
$html = Join-Path $PSScriptRoot 'gameplay-idle-preview.html'

function Export-State {
    param([int]$Width, [int]$Height, [int]$Safe, [int]$Count)
    $name = "combo-state-$Count-$($Width)x$($Height)-safe$Safe.png"
    $source = ([System.Uri]::new($html)).AbsoluteUri + "?mode=game&w=$Width&h=$Height&safe=$Safe&combo=$Count&remaining=2100"
    $tempOutput = Join-Path $env:TEMP ("thatbutton-idle-" + [guid]::NewGuid().ToString('N') + '.png')
    $profile = Join-Path $env:TEMP ("thatbutton-idle-profile-" + [guid]::NewGuid().ToString('N'))
    $output = Join-Path $PSScriptRoot $name
    try {
        $windowWidth = [Math]::Max($Width + 140, 1100)
        $windowHeight = [Math]::Max($Height + 120, 900)
        & $browser --headless --disable-gpu --no-sandbox --allow-file-access-from-files --hide-scrollbars --no-first-run --disable-extensions "--user-data-dir=$profile" --force-device-scale-factor=1 "--window-size=$windowWidth,$windowHeight" '--virtual-time-budget=1500' "--screenshot=$tempOutput" $source | Out-Null
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
            [System.IO.Path]::GetFileName($resolvedProfile).StartsWith('thatbutton-idle-profile-') -and
            (Test-Path -LiteralPath $resolvedProfile)) {
            Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
        }
    }
}

foreach ($count in 0,1,2,12) {
    Export-State 320 568 46 $count
    Export-State 390 844 47 $count
}
