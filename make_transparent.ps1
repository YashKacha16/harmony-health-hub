Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('d:\hospital\harmony-health-hub\public\favicon.png')
$bmp = new-object System.Drawing.Bitmap($img)
$img.Dispose()
$bmp.MakeTransparent([System.Drawing.Color]::White)
$bmp.Save('d:\hospital\harmony-health-hub\public\favicon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
