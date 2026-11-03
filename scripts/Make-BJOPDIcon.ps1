Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap(512,512)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$rect=New-Object System.Drawing.Rectangle(0,0,512,512)
$gradient=New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,[System.Drawing.Color]::FromArgb(8,43,125),[System.Drawing.Color]::FromArgb(0,172,177),45)
$g.FillRectangle($gradient,$rect)
$white=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$green=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(23,231,134))
$blue=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(6,41,125))
$fontBJ=New-Object System.Drawing.Font('Arial',190,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$fontOPD=New-Object System.Drawing.Font('Arial',92,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$fontCross=New-Object System.Drawing.Font('Arial',70,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$center=New-Object System.Drawing.StringFormat
$center.Alignment=[System.Drawing.StringAlignment]::Center
$g.FillEllipse($green,382,40,92,92)
$g.DrawString('+',$fontCross,$white,(New-Object System.Drawing.RectangleF(388,40,82,88)),$center)
$g.DrawString('BJ',$fontBJ,$white,(New-Object System.Drawing.RectangleF(10,125,490,255)),$center)
$g.FillRectangle($green,72,363,366,105)
$g.DrawString('OPD',$fontOPD,$blue,(New-Object System.Drawing.RectangleF(73,367,364,100)),$center)
$path=Join-Path (Get-Location) 'build/icon.png'
$bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $gradient.Dispose(); $white.Dispose(); $green.Dispose(); $blue.Dispose()
Write-Host "BJ OPD icon generated: $path"
