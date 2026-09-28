param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Destination, [int]$Width, [int]$Height, [switch]$NoDither)
Add-Type -AssemblyName System.Drawing
$inputImage = [Drawing.Image]::FromFile($Source)
$scaled = [Drawing.Bitmap]::new($Width,$Height)
$graphics = [Drawing.Graphics]::FromImage($scaled)
$graphics.Clear([Drawing.Color]::White)
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($inputImage,0,0,$Width,$Height)
$graphics.Dispose()
$inputImage.Dispose()
$matrix = @(
  @(0,48,12,60,3,51,15,63), @(32,16,44,28,35,19,47,31),
  @(8,56,4,52,11,59,7,55), @(40,24,36,20,43,27,39,23),
  @(2,50,14,62,1,49,13,61), @(34,18,46,30,33,17,45,29),
  @(10,58,6,54,9,57,5,53), @(42,26,38,22,41,25,37,21)
)
$mono = [Drawing.Bitmap]::new($Width,$Height,[Drawing.Imaging.PixelFormat]::Format1bppIndexed)
$palette = $mono.Palette
$palette.Entries[0] = [Drawing.Color]::Black
$palette.Entries[1] = [Drawing.Color]::White
$mono.Palette = $palette
$bits = $mono.LockBits([Drawing.Rectangle]::new(0,0,$Width,$Height),[Drawing.Imaging.ImageLockMode]::WriteOnly,[Drawing.Imaging.PixelFormat]::Format1bppIndexed)
$data = [byte[]]::new($bits.Stride*$Height)
for($y=0;$y -lt $Height;$y++) {
  for($x=0;$x -lt $Width;$x++) {
    $c=$scaled.GetPixel($x,$y)
    $gray=0.2126*$c.R+0.7152*$c.G+0.0722*$c.B
    # Remove near-black/white generation noise before ordered quantization.
    $gray=[Math]::Clamp(($gray-48)*255/159,0,255)
    $threshold=($matrix[$y%8][$x%8]+0.5)*4
    if($NoDither) { $threshold=127.5 }
    if($gray -gt $threshold) {
      $offset=$y*$bits.Stride+[int][Math]::Floor($x/8)
      $data[$offset]=$data[$offset] -bor (128 -shr ($x%8))
    }
  }
}
[Runtime.InteropServices.Marshal]::Copy($data,0,$bits.Scan0,$data.Length)
$mono.UnlockBits($bits)
$mono.Save($Destination,[Drawing.Imaging.ImageFormat]::Png)
$mono.Dispose()
$scaled.Dispose()
$check=[Drawing.Image]::FromFile($Destination)
Write-Output "$Destination : $($check.Width)x$($check.Height) $($check.PixelFormat)"
$check.Dispose()
