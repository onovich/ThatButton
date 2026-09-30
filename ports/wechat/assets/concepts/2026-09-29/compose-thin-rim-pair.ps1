param(
    [string]$OutputPath = (Join-Path $PSScriptRoot 'hybrid-ui-v11-unified-thin-rim.png')
)

# Image generation supplies the clean plate and the two-character cutout.
# This final placement is deterministic: neither pose is redrawn in the board.
Add-Type -AssemblyName System.Drawing

$basePath = Join-Path $PSScriptRoot 'hybrid-clean-base-no-result-characters.png'
$spritePath = Join-Path $PSScriptRoot 'brain-glove-b-caring-pair-thin-rim.png'

$base = [System.Drawing.Bitmap]::new($basePath)
$sprite = [System.Drawing.Bitmap]::new($spritePath)
$canvas = [System.Drawing.Bitmap]::new($base.Width, $base.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)

try {
    if ($base.Width -ne 1536 -or $base.Height -ne 1024 -or $sprite.Width -ne 1426 -or $sprite.Height -ne 1103) {
        throw 'Unexpected source dimensions; review placement before compositing.'
    }

    $graphics.DrawImage($base, 0, 0, $base.Width, $base.Height)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # A small contact shadow grounds the seated pair above the score card.
    $shadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(42, 177, 104, 0))
    try { $graphics.FillEllipse($shadow, 1084, 492, 264, 23) }
    finally { $shadow.Dispose() }

    # Preserve the cutout's aspect ratio and its approved facial acting.
    $graphics.DrawImage($sprite, [System.Drawing.Rectangle]::new(1067, 290, 300, 232))
    $graphics.Flush()
    $canvas.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Output "Saved $OutputPath"
}
finally {
    $graphics.Dispose()
    $canvas.Dispose()
    $sprite.Dispose()
    $base.Dispose()
}
