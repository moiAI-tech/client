#Requires -RunAsAdministrator

param(
    [string]$AppxPath = "moi 1.0.2.appx"
)

Write-Host "=== MoiAI 完整安装测试 ===" -ForegroundColor Cyan

# 步骤 1: 卸载旧版本
Write-Host "`n步骤 1: 卸载旧版本..." -ForegroundColor Yellow
$oldApp = Get-AppxPackage *MoiAI*
if ($oldApp) {
    Write-Host "找到旧版本: $($oldApp.Version)" -ForegroundColor Gray
    Remove-AppxPackage -Package $oldApp.PackageFullName
    Write-Host "✓ 已卸载" -ForegroundColor Green
} else {
    Write-Host "✓ 无需卸载" -ForegroundColor Green
}

# 步骤 2: 安装新版本
Write-Host "`n步骤 2: 安装应用..." -ForegroundColor Yellow
if (-not (Test-Path $AppxPath)) {
    Write-Host "✗ 找不到: $AppxPath" -ForegroundColor Red
    exit 1
}

try {
    Add-AppxPackage -Path $AppxPath -ErrorAction Stop
    Write-Host "✓ 安装成功" -ForegroundColor Green
} catch {
    Write-Host "✗ 安装失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 步骤 3: 验证安装
Write-Host "`n步骤 3: 验证安装..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$app = Get-AppxPackage *MoiAI*
if (-not $app) {
    Write-Host "✗ 应用未正确安装" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 应用已安装" -ForegroundColor Green
Write-Host "  版本: $($app.Version)" -ForegroundColor Gray
Write-Host "  安装路径: $($app.InstallLocation)" -ForegroundColor Gray

# 步骤 4: 检查文件
Write-Host "`n步骤 4: 检查关键文件..." -ForegroundColor Yellow
& "$PSScriptRoot\check-installed.ps1"

Write-Host "`n=== 测试完成 ===" -ForegroundColor Cyan
Write-Host "现在可以从开始菜单启动应用进行功能测试" -ForegroundColor Yellow