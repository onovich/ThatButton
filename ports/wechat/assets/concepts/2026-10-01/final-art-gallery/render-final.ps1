param([string]$Only = '')

$browserCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is required.' }

Add-Type -AssemblyName System.Drawing
$preview = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..\tests\visual-preview.html'))
$previewUri = ([System.Uri]::new($preview)).AbsoluteUri

$screens = @(
    @{ Name='home'; Mode='home'; Width=390; Height=844; Safe=47 },
    @{ Name='game-ready'; Mode='game'; Width=390; Height=844; Safe=47; Combo=0 },
    @{ Name='game-hit'; Mode='game'; Width=390; Height=844; Safe=47; Combo=1 },
    @{ Name='game-combo-3'; Mode='game'; Width=390; Height=844; Safe=47; Combo=3 },
    @{ Name='game-combo-11'; Mode='game'; Width=390; Height=844; Safe=47; Combo=11 },
    @{ Name='game-combo'; Mode='game'; Width=390; Height=844; Safe=47; Combo=12 },
    @{ Name='game-ready-small'; Mode='game'; Width=320; Height=568; Safe=46; Combo=0 },
    @{ Name='game-hit-small'; Mode='game'; Width=320; Height=568; Safe=46; Combo=1 },
    @{ Name='game-combo-3-small'; Mode='game'; Width=320; Height=568; Safe=46; Combo=3 },
    @{ Name='game-combo-11-small'; Mode='game'; Width=320; Height=568; Safe=46; Combo=11 },
    @{ Name='game-combo-small'; Mode='game'; Width=320; Height=568; Safe=46; Combo=12 },
    @{ Name='upgrade'; Mode='upgrade'; Width=390; Height=844; Safe=47 },
    @{ Name='upgrade-alternate'; Mode='upgrade'; Width=390; Height=844; Safe=47; Fourth=1 },
    @{ Name='result'; Mode='result'; Width=390; Height=844; Safe=47 },
    @{ Name='result-timeout'; Mode='result'; Width=390; Height=844; Safe=47; Reason='timeout' },
    @{ Name='result-small'; Mode='result'; Width=320; Height=568; Safe=46 },
    @{ Name='result-timeout-small'; Mode='result'; Width=320; Height=568; Safe=46; Reason='timeout' },
    @{ Name='result-timeout-tall'; Mode='result'; Width=492; Height=1007; Safe=47; Reason='timeout' },
    @{ Name='result-long-rule-small'; Mode='result'; Width=320; Height=568; Safe=46; Rule='long' },
    @{ Name='result-high-score'; Mode='result'; Width=390; Height=844; Safe=47; Level=128; Score=9876543; BestLevel=128; BestScore=9876543 },
    @{ Name='result-high-score-small'; Mode='result'; Width=320; Height=568; Safe=46; Level=128; Score=9876543; BestLevel=128; BestScore=9876543 },
    @{ Name='help'; Mode='help'; Width=390; Height=844; Safe=47 },
    @{ Name='settings'; Mode='settings'; Width=390; Height=844; Safe=47 },
    @{ Name='resume'; Mode='resume'; Width=390; Height=844; Safe=47 },
    @{ Name='resource-error'; Mode='resource-error'; Width=390; Height=844; Safe=47 }
)

foreach ($screen in $screens) {
    if ($Only -and $screen.Name -notlike "*$Only*") { continue }
    $name = "final-$($screen.Name).png"
    $width = [int]$screen.Width
    $height = [int]$screen.Height
    $url = "$previewUri`?mode=$($screen.Mode)&w=$width&h=$height&safe=$($screen.Safe)"
    if ($screen.ContainsKey('Combo')) { $url += "&combo=$($screen.Combo)" }
    if ($screen.ContainsKey('Fourth')) { $url += "&fourth=$($screen.Fourth)" }
    if ($screen.ContainsKey('Reason')) { $url += "&reason=$($screen.Reason)" }
    if ($screen.ContainsKey('Rule')) { $url += "&rule=$($screen.Rule)" }
    if ($screen.ContainsKey('Level')) { $url += "&resultLevel=$($screen.Level)" }
    if ($screen.ContainsKey('Score')) { $url += "&resultScore=$($screen.Score)" }
    if ($screen.ContainsKey('BestLevel')) { $url += "&resultBestLevel=$($screen.BestLevel)" }
    if ($screen.ContainsKey('BestScore')) { $url += "&resultBestScore=$($screen.BestScore)" }
    $tempOutput = Join-Path $env:TEMP ("thatbutton-final-" + [guid]::NewGuid().ToString('N') + '.png')
    $profile = Join-Path $env:TEMP ("thatbutton-final-profile-" + [guid]::NewGuid().ToString('N'))
    $output = Join-Path $PSScriptRoot $name
    try {
        $windowWidth = [Math]::Max($width + 140, 1100)
        $windowHeight = [Math]::Max($height + 120, 900)
        & $browser --headless --disable-gpu --no-sandbox --allow-file-access-from-files --hide-scrollbars --no-first-run --disable-extensions "--user-data-dir=$profile" --force-device-scale-factor=1 "--window-size=$windowWidth,$windowHeight" '--virtual-time-budget=1800' "--screenshot=$tempOutput" $url | Out-Null
        if (-not (Test-Path -LiteralPath $tempOutput)) { throw "Browser did not render $name" }
        $full = [System.Drawing.Bitmap]::new($tempOutput)
        try {
            $crop = $full.Clone([System.Drawing.Rectangle]::new(0, 0, $width, $height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
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
            [System.IO.Path]::GetFileName($resolvedProfile).StartsWith('thatbutton-final-profile-') -and
            (Test-Path -LiteralPath $resolvedProfile)) {
            Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
        }
    }
}
