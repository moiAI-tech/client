#Requires -RunAsAdministrator

param(
    [string]$AppxPath = "moi 1.0.2.appx"
)

$ErrorActionPreference = "Stop"

Write-Host "=== MoiAI 自动签名并测试 ===" -ForegroundColor Cyan

# 检查文件是否存在
if (-not (Test-Path $AppxPath)) {
    Write-Host "错误: 找不到 $AppxPath" -ForegroundColor Red
    exit 1
}

# 查找 SignTool 和 MakeAppx
Write-Host "`n查找 Windows SDK 工具..." -ForegroundColor Yellow
$kitPath = "C:\Program Files (x86)\Windows Kits\10\bin"
$signTool = Get-ChildItem $kitPath -Recurse -Filter "signtool.exe" -ErrorAction SilentlyContinue | 
            Where-Object { $_.FullName -match "x64" } | 
            Select-Object -First 1 -ExpandProperty FullName

$makeAppx = Get-ChildItem $kitPath -Recurse -Filter "makeappx.exe" -ErrorAction SilentlyContinue | 
            Where-Object { $_.FullName -match "x64" } | 
            Select-Object -First 1 -ExpandProperty FullName

if (-not $signTool -or -not $makeAppx) {
    Write-Host "错误: 未找到 Windows SDK 工具" -ForegroundColor Red
    Write-Host "请安装: winget install Microsoft.WindowsSDK" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ 找到 SignTool: $signTool" -ForegroundColor Green
Write-Host "✓ 找到 MakeAppx: $makeAppx" -ForegroundColor Green

# 步骤 1: 检查/创建证书
Write-Host "`n步骤 1: 检查证书..." -ForegroundColor Yellow
$certSubject = "CN=9949892F-962A-41B4-87F6-C8E4C5B707F2"

# 查找现有证书（只取第一个）
$existingCerts = Get-ChildItem Cert:\CurrentUser\My -CodeSigningCert | 
                 Where-Object {$_.Subject -eq $certSubject}

if ($existingCerts) {
    # 如果有多个，删除旧的，只保留最新的
    if ($existingCerts -is [Array]) {
        Write-Host "发现 $($existingCerts.Count) 个匹配的证书，清理旧证书..." -ForegroundColor Yellow
        
        # 按创建日期排序，保留最新的
        $sortedCerts = $existingCerts | Sort-Object -Property NotBefore -Descending
        $cert = $sortedCerts[0]
        
        # 删除其他旧证书
        for ($i = 1; $i -lt $sortedCerts.Count; $i++) {
            Remove-Item -Path "Cert:\CurrentUser\My\$($sortedCerts[$i].Thumbprint)" -Force
            Write-Host "  已删除旧证书: $($sortedCerts[$i].Thumbprint)" -ForegroundColor Gray
        }
    } else {
        $cert = $existingCerts
    }
    
    Write-Host "✓ 使用现有证书" -ForegroundColor Green
} else {
    Write-Host "创建新证书..." -ForegroundColor Gray
    $cert = New-SelfSignedCertificate `
        -Subject $certSubject `
        -Type CodeSigningCert `
        -CertStoreLocation Cert:\CurrentUser\My `
        -HashAlgorithm SHA256 `
        -KeyLength 2048 `
        -KeyExportPolicy Exportable `
        -NotAfter (Get-Date).AddYears(2)
    
    Write-Host "✓ 证书已创建" -ForegroundColor Green
}

Write-Host "  证书指纹: $($cert.Thumbprint)" -ForegroundColor Gray
Write-Host "  有效期至: $($cert.NotAfter.ToString('yyyy-MM-dd'))" -ForegroundColor Gray

# 安装证书到受信任的根
Write-Host "`n步骤 2: 安装证书到受信任的根..." -ForegroundColor Yellow
$cerPath = ".\MoiAI-Cert.cer"

try {
    # 导出证书（现在 $cert 是单个对象）
    Export-Certificate -Cert $cert -FilePath $cerPath -Force | Out-Null
    Write-Host "✓ 证书已导出到: $cerPath" -ForegroundColor Green
    
    # 导入到受信任的根
    $existingRootCert = Get-ChildItem Cert:\LocalMachine\Root | 
                        Where-Object {$_.Thumbprint -eq $cert.Thumbprint}
    
    if (-not $existingRootCert) {
        Import-Certificate -FilePath $cerPath -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
        Write-Host "✓ 证书已安装到受信任的根" -ForegroundColor Green
    } else {
        Write-Host "✓ 证书已存在于受信任的根" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠ 证书导入警告: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "  继续尝试签名..." -ForegroundColor Gray
}

# 步骤 3: 解压 APPX
Write-Host "`n步骤 3: 解压 APPX..." -ForegroundColor Yellow
$extractPath = ".\temp_appx_extract"
if (Test-Path $extractPath) {
    Remove-Item $extractPath -Recurse -Force
}

& $makeAppx unpack /p $AppxPath /d $extractPath /l | Out-Null
Write-Host "✓ 已解压到临时目录" -ForegroundColor Green

# 步骤 4: 验证并修改 Manifest
Write-Host "`n步骤 4: 验证 AppxManifest.xml..." -ForegroundColor Yellow
$manifestPath = Join-Path $extractPath "AppxManifest.xml"
[xml]$manifest = Get-Content $manifestPath
$currentPublisher = $manifest.Package.Identity.Publisher

Write-Host "  当前 Publisher: $currentPublisher" -ForegroundColor Gray
Write-Host "  证书 Subject: $certSubject" -ForegroundColor Gray

if ($currentPublisher -ne $certSubject) {
    Write-Host "  ⚠ Publisher 不匹配，正在更新..." -ForegroundColor Yellow
    $manifest.Package.Identity.Publisher = $certSubject
    $manifest.Save($manifestPath)
    Write-Host "  ✓ 已更新 Publisher" -ForegroundColor Green
} else {
    Write-Host "  ✓ Publisher 匹配" -ForegroundColor Green
}

# 步骤 5: 重新打包
Write-Host "`n步骤 5: 重新打包..." -ForegroundColor Yellow
$signedAppxPath = [System.IO.Path]::ChangeExtension($AppxPath, "signed.appx")
if (Test-Path $signedAppxPath) {
    Remove-Item $signedAppxPath -Force
}

& $makeAppx pack /d $extractPath /p $signedAppxPath /l | Out-Null
Write-Host "✓ 已打包: $signedAppxPath" -ForegroundColor Green

# 步骤 6: 签名
Write-Host "`n步骤 6: 签名 APPX..." -ForegroundColor Yellow
Write-Host "  使用证书: $($cert.Thumbprint)" -ForegroundColor Gray

$signOutput = & $signTool sign /fd SHA256 /sha1 $cert.Thumbprint /t http://timestamp.digicert.com $signedAppxPath 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 签名成功!" -ForegroundColor Green
} else {
    Write-Host "✗ 签名失败" -ForegroundColor Red
    Write-Host $signOutput -ForegroundColor Red
    
    # 清理
    Remove-Item $extractPath -Recurse -Force
    exit 1
}

# 验证签名
Write-Host "`n步骤 7: 验证签名..." -ForegroundColor Yellow
$verifyOutput = & $signTool verify /pa $signedAppxPath 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ 签名验证成功" -ForegroundColor Green
} else {
    Write-Host "⚠ 签名验证警告（但应该可以安装）" -ForegroundColor Yellow
}

# 清理临时文件
Remove-Item $extractPath -Recurse -Force
Write-Host "✓ 已清理临时文件" -ForegroundColor Green

# 步骤 8: 卸载旧版本
Write-Host "`n步骤 8: 卸载旧版本..." -ForegroundColor Yellow
$oldApp = Get-AppxPackage *MoiAI*
if ($oldApp) {
    Write-Host "  找到旧版本: $($oldApp.Version)" -ForegroundColor Gray
    Write-Host "  安装位置: $($oldApp.InstallLocation)" -ForegroundColor Gray
    Remove-AppxPackage -Package $oldApp.PackageFullName
    Write-Host "✓ 已卸载旧版本" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "✓ 无旧版本需要卸载" -ForegroundColor Green
}

# 步骤 9: 安装新版本
Write-Host "`n步骤 9: 安装应用..." -ForegroundColor Yellow
try {
    Add-AppxPackage -Path $signedAppxPath -ErrorAction Stop
    Write-Host "✓ 安装成功!" -ForegroundColor Green
} catch {
    Write-Host "✗ 安装失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n可能的解决方案:" -ForegroundColor Yellow
    Write-Host "1. 确保已启用开发者模式" -ForegroundColor White
    Write-Host "2. 检查证书是否正确安装到受信任的根" -ForegroundColor White
    exit 1
}

# 步骤 10: 验证安装
Write-Host "`n步骤 10: 验证安装..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

$newApp = Get-AppxPackage *MoiAI*
if (-not $newApp) {
    Write-Host "✗ 应用未正确安装" -ForegroundColor Red
    exit 1
}

Write-Host "✓ 应用已成功安装" -ForegroundColor Green
Write-Host "  包名: $($newApp.Name)" -ForegroundColor Gray
Write-Host "  版本: $($newApp.Version)" -ForegroundColor Gray
Write-Host "  架构: $($newApp.Architecture)" -ForegroundColor Gray
Write-Host "  安装路径: $($newApp.InstallLocation)" -ForegroundColor Gray

# 步骤 11: 检查关键文件
Write-Host "`n步骤 11: 检查关键文件..." -ForegroundColor Yellow
$installPath = $newApp.InstallLocation

$criticalFiles = @{
    "onnxruntime_binding.node" = "app\resources\app.asar.unpacked\node_modules\onnxruntime-node\bin\napi-v3\win32\x64\onnxruntime_binding.node"
    "onnxruntime.dll" = "app\resources\app.asar.unpacked\node_modules\onnxruntime-node\bin\napi-v3\win32\x64\onnxruntime.dll"
    "sherpa-onnx.node" = "app\resources\app.asar.unpacked\node_modules\sherpa-onnx-win-x64\sherpa-onnx.node"
    "sharp.node" = "app\resources\app.asar.unpacked\node_modules\@img\sharp-win32-x64\lib\sharp-win32-x64.node"
}

$allFound = $true
foreach ($name in $criticalFiles.Keys) {
    $relativePath = $criticalFiles[$name]
    $fullPath = Join-Path $installPath $relativePath
    
    if (Test-Path $fullPath) {
        $fileInfo = Get-Item $fullPath
        $size = "{0:N2} KB" -f ($fileInfo.Length / 1KB)
        Write-Host "  ✓ $name ($size)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $name (未找到)" -ForegroundColor Red
        Write-Host "    期望路径: $relativePath" -ForegroundColor Gray
        $allFound = $false
    }
}

# 统计所有 .node 文件
$allNodeFiles = Get-ChildItem -Path $installPath -Recurse -Filter "*.node" -ErrorAction SilentlyContinue
Write-Host "`n  总共找到 $($allNodeFiles.Count) 个 .node 文件" -ForegroundColor Cyan

# 最终结果
Write-Host "`n" + ("=" * 80) -ForegroundColor Gray
Write-Host "=== 安装测试完成 ===" -ForegroundColor Cyan

if ($allFound) {
    Write-Host "✓ 所有关键文件都已正确安装!" -ForegroundColor Green
    Write-Host "✓ 应用应该可以正常运行" -ForegroundColor Green
} else {
    Write-Host "⚠ 部分文件未找到，可能会影响某些功能" -ForegroundColor Yellow
}

Write-Host "`n生成的文件:" -ForegroundColor Cyan
Write-Host "  签名后的 APPX: $(Resolve-Path $signedAppxPath)" -ForegroundColor White
Write-Host "  证书文件: $(Resolve-Path $cerPath)" -ForegroundColor White

Write-Host "`n下一步:" -ForegroundColor Yellow
Write-Host "  1. 从开始菜单启动 'MoiAI' 测试应用功能" -ForegroundColor White
Write-Host "  2. 如需在其他电脑安装，需要:" -ForegroundColor White
Write-Host "     - $signedAppxPath (签名后的安装包)" -ForegroundColor Gray
Write-Host "     - $cerPath (证书文件)" -ForegroundColor Gray

# 询问是否打开安装目录
Write-Host ""
$open = Read-Host "是否在资源管理器中打开安装目录? (Y/N)"
if ($open -eq "Y" -or $open -eq "y") {
    explorer.exe $installPath
}

Write-Host "`n感谢使用！" -ForegroundColor Cyan