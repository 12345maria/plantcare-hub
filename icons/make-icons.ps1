Add-Type -AssemblyName System.Drawing

function New-LeafIcon {
    param([int]$size)
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::FromArgb(21, 47, 33))

    $leaf = New-Object System.Drawing.Drawing2D.GraphicsPath
    $cx = $size / 2.0
    $w = $size * 0.42
    $h = $size * 0.55
    $x = $cx - $w / 2.0
    $y = $size * 0.18

    $leaf.AddBezier(
        [float]$cx, [float]$y,
        [float]($x - $w * 0.1), [float]($y + $h * 0.35),
        [float]($x - $w * 0.05), [float]($y + $h * 0.85),
        [float]$cx, [float]($y + $h)
    )
    $leaf.AddBezier(
        [float]$cx, [float]($y + $h),
        [float]($x + $w + $w * 0.05), [float]($y + $h * 0.85),
        [float]($x + $w + $w * 0.1), [float]($y + $h * 0.35),
        [float]$cx, [float]$y
    )

    $b1 = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(107, 207, 142))
    $g.FillPath($b1, $leaf)
    $b1.Dispose()
    $leaf.Dispose()
    $g.Dispose()
    return $bmp
}

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

foreach ($s in 192, 512) {
    $bmp = New-LeafIcon $s
    $bmp.Save((Join-Path $dir "icon-$s.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

$bmp180 = New-LeafIcon 180
$bmp180.Save((Join-Path $dir "apple-touch-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp180.Dispose()

Write-Output "Icons written to $dir"
