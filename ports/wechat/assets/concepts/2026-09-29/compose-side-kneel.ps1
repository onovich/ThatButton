param(
    [string]$OutputPath = (Join-Path $PSScriptRoot 'hybrid-ui-v9-clean-exact-side-kneel.png')
)

# The clean plate is generated with imagegen. This last step is deliberately
# deterministic so the accepted transparent character's limb topology cannot
# be redrawn during composition.
Add-Type -AssemblyName System.Drawing

$basePath = Join-Path $PSScriptRoot 'hybrid-clean-base-no-brain.png'
$spritePath = Join-Path $PSScriptRoot 'brain-failure-side-kneel-four-limbs.png'

$base = [System.Drawing.Bitmap]::new($basePath)
$sprite = [System.Drawing.Bitmap]::new($spritePath)
$canvas = [System.Drawing.Bitmap]::new($base.Width, $base.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)

try {
    if ($base.Width -ne 1536 -or $base.Height -ne 1024 -or $sprite.Width -ne 1536 -or $sprite.Height -ne 1024) {
        throw 'Unexpected source dimensions; review the placement before compositing.'
    }

    $graphics.DrawImage($base, 0, 0, $base.Width, $base.Height)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($sprite, [System.Drawing.Rectangle]::new(964, 335, 278, 185))
    $graphics.Flush()

    # Restore the glove's original white comforting hand over the sprite. The
    # flood fill starts inside that hand and selects only its white/blue fill
    # and navy outline, not the yellow background or the pink brain.
    $left = 1138; $top = 340; $right = 1215; $bottom = 400
    $regionWidth = $right - $left + 1
    $visited = [bool[]]::new($regionWidth * ($bottom - $top + 1))
    $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()
    $queue.Enqueue([System.Drawing.Point]::new(1160, 360))
    $restoredPixels = 0

    while ($queue.Count -gt 0) {
        $point = $queue.Dequeue()
        $x = $point.X; $y = $point.Y
        if ($x -lt $left -or $x -gt $right -or $y -lt $top -or $y -gt $bottom) { continue }
        $index = ($y - $top) * $regionWidth + ($x - $left)
        if ($visited[$index]) { continue }
        $visited[$index] = $true

        $color = $base.GetPixel($x, $y)
        $handPixel = ($color.B -ge 128) -or (($color.R -le 105) -and ($color.G -le 125))
        if (-not $handPixel) { continue }

        $canvas.SetPixel($x, $y, $color)
        $restoredPixels++
        for ($dy = -1; $dy -le 1; $dy++) {
            for ($dx = -1; $dx -le 1; $dx++) {
                if ($dx -ne 0 -or $dy -ne 0) {
                    $queue.Enqueue([System.Drawing.Point]::new($x + $dx, $y + $dy))
                }
            }
        }
    }

    if ($restoredPixels -lt 100 -or $restoredPixels -gt 4000) {
        throw "Comforting-hand mask is unexpected: $restoredPixels pixels."
    }

    $canvas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Saved $OutputPath; restored $restoredPixels glove-hand pixels."
}
finally {
    $graphics.Dispose()
    $canvas.Dispose()
    $sprite.Dispose()
    $base.Dispose()
}
