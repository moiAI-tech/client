#Requires -RunAsAdministrator

param(
    [string]$SourceImage = "assets/icon.png"
)

Write-Host "=== 生成 Windows Store 图标 ===" -ForegroundColor Cyan

# 检查源图像
if (-not (Test-Path $SourceImage)) {
    Write-Host "错误: 找不到源图像 $SourceImage" -ForegroundColor Red
    Write-Host "请准备一个 1024x1024 的 PNG 图像" -ForegroundColor Yellow
    exit 1
}

# 确保 assets 目录存在
$assetsDir = "assets"
if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

# 需要的图标尺寸
$iconSizes = @{
    "Square44x44Logo.png" = 44
    "Square71x71Logo.png" = 71
    "Square150x150Logo.png" = 150
    "Square310x310Logo.png" = 310
    "StoreLogo.png" = 50
    "Wide310x150Logo.png" = @(310, 150)  # 宽度x高度
}

Write-Host "`n需要安装的工具:" -ForegroundColor Yellow
Write-Host "1. ImageMagick: winget install ImageMagick.ImageMagick" -ForegroundColor White
Write-Host "2. 或者使用在线工具: https://resizeimage.net/" -ForegroundColor White
Write-Host "3. 或者手动使用 Photoshop/GIMP 等工具" -ForegroundColor White

Write-Host "`n所需图标列表:" -ForegroundColor Cyan
foreach ($name in $iconSizes.Keys) {
    $size = $iconSizes[$name]
    if ($size -is [Array]) {
        Write-Host "  $name - ${size[0]}x${size[1]} 像素" -ForegroundColor White
    } else {
        Write-Host "  $name - ${size}x${size} 像素" -ForegroundColor White
    }
}

# 检查是否安装了 ImageMagick
$magick = Get-Command magick -ErrorAction SilentlyContinue

if ($magick) {
    Write-Host "`n找到 ImageMagick，开始生成图标..." -ForegroundColor Green
    
    foreach ($name in $iconSizes.Keys) {
        $outputPath = Join-Path $assetsDir $name
        $size = $iconSizes[$name]
        
        if ($size -is [Array]) {
            # Wide logo
            & magick convert $SourceImage -resize "$($size[0])x$($size[1])!" $outputPath
        } else {
            # Square logos
            & magick convert $SourceImage -resize "${size}x${size}" $outputPath
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ $name" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $name 生成失败" -ForegroundColor Red
        }
    }
    
    Write-Host "`n✓ 图标生成完成！" -ForegroundColor Green
} else {
    Write-Host "`n未找到 ImageMagick，请手动创建图标" -ForegroundColor Yellow
    Write-Host "或运行: winget install ImageMagick.ImageMagick" -ForegroundColor White
}

Write-Host "`n图标保存位置: $(Resolve-Path $assetsDir)" -ForegroundColor Cyan