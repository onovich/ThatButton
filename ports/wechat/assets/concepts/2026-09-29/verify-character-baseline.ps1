$expected = [ordered]@{
    'hybrid-ui-v11-unified-thin-rim.png' = 'F12DC8714A3335FE4D3CAA42F3D55CA30F6F7F4676DD8B0A36664F73A7D0A8C5'
    'brain-glove-b-caring-pair-thin-rim.png' = '1A510BF193C9F120320770A4C50EE89016FE1F0676696FF26461DA0C085E803D'
}

$failed = $false
foreach ($name in $expected.Keys) {
    $path = Join-Path $PSScriptRoot $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        Write-Error "Missing character baseline: $path"
        $failed = $true
        continue
    }

    $actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $path).Hash
    if (-not [string]::Equals($actual, $expected[$name], [System.StringComparison]::OrdinalIgnoreCase)) {
        Write-Error "Character baseline changed: $name`nExpected: $($expected[$name])`nActual:   $actual"
        $failed = $true
    }
    else {
        Write-Output "OK $name"
    }
}

if ($failed) { exit 1 }
Write-Output 'Character baseline v11 is intact.'
