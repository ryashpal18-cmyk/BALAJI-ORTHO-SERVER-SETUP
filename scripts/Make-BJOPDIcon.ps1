Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::new(512,512)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint=[System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$rect=[System.Drawing.Rectangle]::new(0,0,512,512)
$gradient=[System.Drawing.Drawing2D.LinearGradientBrush]::new($rect,[System.Drawing.Color]::FromArgb(8,43,125),[System.Drawing.Color]::FromArgb(0,172,177),45)
$g.FillRectangle($gradient,$rect)
$white=[System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$green=[System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(23,231,134))
$blue=[System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(6,41,125))
$fontBJ=[System.Drawing.Font]::new('Arial',190,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$fontOPD=[System.Drawing.Font]::new('Arial',92,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$fontCross=[System.Drawing.Font]::new('Arial',70,[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
$center=[System.Drawing.StringFormat]::new()
$center.Alignment=[System.Drawing.StringAlignment]::Center
$g.FillEllipse($green,382,40,92,92)
$g.DrawString('+',$fontCross,$white,([System.Drawing.RectangleF]::new(388,40,82,88)),$center)
$g.DrawString('BJ',$fontBJ,$white,([System.Drawing.RectangleF]::new(10,125,490,255)),$center)
$g.FillRectangle($green,72,363,366,105)
$g.DrawString('OPD',$fontOPD,$blue,([System.Drawing.RectangleF]::new(73,367,364,100)),$center)
$path=Join-Path (Get-Location) 'build/icon.png'
$bmp.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $gradient.Dispose(); $white.Dispose(); $green.Dispose(); $blue.Dispose()
Write-Host "BJ OPD icon generated: $path"
