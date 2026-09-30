param(
    [string]$BaseUrl = 'http://127.0.0.1:8766',
    [string]$Version = 'v16',
    [string]$Only = ''
)

$browserCandidates = @(
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)
$browser = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) { throw 'Chrome or Edge is required for the Canvas preview.' }

Add-Type -AssemblyName System.Drawing
$evidence = Join-Path $PSScriptRoot 'visual-evidence'
New-Item -ItemType Directory -Path $evidence -Force | Out-Null

function Export-Preview {
    param([string]$Mode, [int]$Width, [int]$Height, [int]$Safe,
          [string]$Reason = '', [string]$Rule = '', [int]$Combo = 4,
          [int]$Remaining = 2100, [string]$Motion = '',
          [string]$Trigger = '', [int]$Budget = 1800, [int]$Score = 900,
          [bool]$Fourth = $false, [string]$Choices = '', [int]$Hp = 82,
          [int]$MaxHp = 100)
    $suffix = if ($Reason) { "-$Reason" } elseif ($Rule) { "-$Rule-rule" } else { '' }
    if ($Combo -ne 4) { $suffix += "-combo$Combo" }
    if ($Remaining -ne 2100) { $suffix += "-remaining$Remaining" }
    if ($Motion) { $suffix += '-motion' }
    if ($Trigger) { $suffix += "-$Trigger" }
    if ($Budget -ne 1800) { $suffix += "-t$Budget" }
    if ($Score -ne 900) { $suffix += "-score$Score" }
    if ($Fourth) { $suffix += '-fourth' }
    if ($Choices) { $suffix += '-simulator-order' }
    if ($Hp -ne 82) { $suffix += "-hp$Hp" }
    if ($MaxHp -ne 100) { $suffix += "-maxhp$MaxHp" }
    $name = "$Version-$Mode$suffix-$Width-safe$Safe.png"
    if ($Only -and $name -notlike "*$Only*") { return }
    $output = Join-Path $evidence $name
    $temp = Join-Path $env:TEMP ("thatbutton-preview-" + [guid]::NewGuid().ToString('N') + '.png')
    $profile = Join-Path $env:TEMP ("thatbutton-preview-profile-" + [guid]::NewGuid().ToString('N'))
    $url = "$BaseUrl/ports/wechat/tests/visual-preview.html?mode=$Mode&w=$Width&h=$Height&safe=$Safe&combo=$Combo&remaining=$Remaining&score=$Score"
    if ($Reason) { $url += "&reason=$Reason" }
    if ($Rule) { $url += "&rule=$Rule" }
    if ($Motion) { $url += '&motion=1' }
    if ($Trigger) { $url += "&trigger=$Trigger" }
    if ($Fourth) { $url += '&fourth=1' }
    if ($Choices) { $url += "&choices=$Choices" }
    if ($Hp -ne 82) { $url += "&hp=$Hp" }
    if ($MaxHp -ne 100) { $url += "&maxHp=$MaxHp" }
    try {
        $windowWidth = [Math]::Max($Width + 140, 1100)
        $windowHeight = [Math]::Max($Height + 120, 900)
        & $browser --headless --disable-gpu --no-sandbox --hide-scrollbars --no-first-run --disable-extensions "--user-data-dir=$profile" --force-device-scale-factor=1 "--window-size=$windowWidth,$windowHeight" "--virtual-time-budget=$Budget" "--screenshot=$temp" $url | Out-Null
        if (-not (Test-Path -LiteralPath $temp -PathType Leaf)) { throw "Browser did not render $name" }
        $full = [System.Drawing.Bitmap]::new($temp)
        try {
            if ($full.Width -lt $Width -or $full.Height -lt $Height) { throw "Viewport is too small for $name" }
            $crop = $full.Clone([System.Drawing.Rectangle]::new(0, 0, $Width, $Height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            try { $crop.Save($output, [System.Drawing.Imaging.ImageFormat]::Png) }
            finally { $crop.Dispose() }
        }
        finally { $full.Dispose() }
        Write-Output $output
    }
    finally {
        if (Test-Path -LiteralPath $temp) { Remove-Item -LiteralPath $temp -Force }
        $tempRoot = [System.IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
        $resolvedProfile = [System.IO.Path]::GetFullPath($profile)
        if ($resolvedProfile.StartsWith($tempRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
            [System.IO.Path]::GetFileName($resolvedProfile).StartsWith('thatbutton-preview-profile-') -and
            (Test-Path -LiteralPath $resolvedProfile)) {
            Remove-Item -LiteralPath $resolvedProfile -Recurse -Force
        }
    }
}

Export-Preview 'home' 320 568 46
Export-Preview 'game' 320 568 46
Export-Preview 'result' 320 568 46
Export-Preview 'result' 320 568 46 'timeout'
Export-Preview 'result' 320 568 46 '' 'long'
Export-Preview 'home' 390 844 10
Export-Preview 'game' 390 844 10
Export-Preview 'result' 390 844 10
Export-Preview 'result' 390 844 10 'timeout'
Export-Preview 'result' 390 844 10 '' 'long'
Export-Preview 'home' 390 844 47
Export-Preview 'game' 390 844 47
Export-Preview 'result' 390 844 47
Export-Preview 'game' 320 568 46 '' '' 12
Export-Preview 'game' 390 844 47 '' '' 12
Export-Preview 'game' 390 844 47 '' '' 0
Export-Preview 'game' 320 568 46 '' '' 0
Export-Preview 'game' 320 568 46 '' '' 1
Export-Preview 'game' 320 568 46 '' '' 2
Export-Preview 'game' 390 844 47 '' '' 1
Export-Preview 'game' 390 844 47 '' '' 2
Export-Preview 'game' 390 844 47 '' '' 4 600
Export-Preview 'help' 320 568 46
Export-Preview 'settings' 320 568 46
Export-Preview 'upgrade' 320 568 46
Export-Preview 'resume' 320 568 46
Export-Preview 'help' 390 844 47
Export-Preview 'settings' 390 844 47
Export-Preview 'upgrade' 390 844 47
Export-Preview 'upgrade' 328 710 54
Export-Preview 'upgrade' 390 844 64
Export-Preview -Mode 'upgrade' -Width 328 -Height 710 -Safe 54 -Score 1180 -Hp 10 -Choices 'round-time-plus,base-attack-plus,chain-span-plus'
Export-Preview -Mode 'upgrade' -Width 328 -Height 710 -Safe 54 -Score 1180 -Hp 100 -Choices 'round-time-plus,base-attack-plus,chain-span-plus'
Export-Preview -Mode 'upgrade' -Width 328 -Height 710 -Safe 54 -Score 1234567 -Hp 124 -MaxHp 124 -Choices 'round-time-plus,base-attack-plus,chain-span-plus'
Export-Preview -Mode 'upgrade' -Width 320 -Height 568 -Safe 46 -Score 999999999 -Hp 999 -MaxHp 999 -Fourth $true
Export-Preview -Mode 'upgrade' -Width 320 -Height 568 -Safe 46 -Fourth $true
Export-Preview -Mode 'upgrade' -Width 390 -Height 844 -Safe 47 -Fourth $true
Export-Preview 'resume' 390 844 47
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' 'wrong' 260
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' 'safe' 260
Export-Preview 'upgrade' 390 844 47 '' '' 4 2100 '1' 'upgrade' 320
Export-Preview 'home' 390 844 47 '' '' 4 2100 '1' '' 260
Export-Preview 'home' 390 844 47 '' '' 4 2100 '1' '' 510
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' '' 260
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' '' 510
Export-Preview 'result' 390 844 47 '' '' 4 2100 '1' '' 260
Export-Preview 'result' 390 844 47 '' '' 4 2100 '1' '' 710
Export-Preview 'help' 390 844 47 '' '' 4 2100 '1' '' 260
Export-Preview 'settings' 390 844 47 '' '' 4 2100 '1' '' 260
Export-Preview 'resume' 390 844 47 '' '' 4 2100 '1' '' 260
Export-Preview 'home' 390 844 47 '' '' 4 2100 '1' '' 300
Export-Preview 'home' 390 844 47 '' '' 4 2100 '1' '' 470
Export-Preview 'home' 390 844 47 '' '' 4 2100 '1' '' 760
Export-Preview 'home' 390 844 47 '' '' 4 2100 '1' '' 900
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' '' 300
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' '' 470
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' '' 760
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' '' 900
Export-Preview 'result' 390 844 47 '' '' 4 2100 '1' '' 650
Export-Preview 'result' 390 844 47 '' '' 4 2100 '1' '' 850
Export-Preview 'result' 390 844 47 '' '' 4 2100 '1' '' 1120
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' 'round-exit' 290
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' 'round-enter' 290
Export-Preview 'game' 390 844 47 '' '' 4 2100 '1' 'round-enter' 650
Export-Preview -Mode 'game' -Width 320 -Height 568 -Safe 46 -Score 123456
