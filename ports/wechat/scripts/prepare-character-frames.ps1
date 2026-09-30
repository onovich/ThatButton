param([string]$Ffmpeg = 'ffmpeg')

$sourceRoot = Join-Path $PSScriptRoot '..\assets\concepts\2026-09-30\character-frames-v19'
$outputRoot = Join-Path $PSScriptRoot '..\assets\runtime\frames'
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$frames = @(
    @{ Name = 'running-1'; Width = 840; Height = 452 },
    @{ Name = 'running-2'; Width = 840; Height = 452 },
    @{ Name = 'separated-1'; Width = 900; Height = 316 },
    @{ Name = 'separated-2'; Width = 900; Height = 316 },
    @{ Name = 'caring-1'; Width = 760; Height = 577 },
    @{ Name = 'caring-2'; Width = 760; Height = 577 }
)

foreach ($frame in $frames) {
    $inputPath = Join-Path $sourceRoot ($frame.Name + '.png')
    $outputPath = Join-Path $outputRoot ($frame.Name + '.png')
    if (-not (Test-Path -LiteralPath $inputPath -PathType Leaf)) {
        throw "Missing generated source frame: $inputPath"
    }
    $filter = "[0:v]scale=$($frame.Width):$($frame.Height):flags=lanczos,format=rgba,split[a][b];[a]palettegen=reserve_transparent=1:max_colors=256[p];[b][p]paletteuse=dither=none"
    & $Ffmpeg -hide_banner -loglevel error -y -i $inputPath -filter_complex $filter -frames:v 1 $outputPath
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $outputPath -PathType Leaf)) {
        throw "Failed to prepare $($frame.Name)"
    }
    Write-Output $outputPath
}
