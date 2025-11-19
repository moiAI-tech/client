#Requires -RunAsAdministrator

param(
    [string]$AppxPath = "moi 1.0.2.appx"
)

$ErrorActionPreference = "Stop"

Write-Host "=== 改进的 APPX 包检查 ===" -ForegroundColor Cyan

if (-not (Test-Path $AppxPath)) {
    Write-Host "错误: 找不到 $AppxPath" -ForegroundColor Red
    exit 1
}

# 查找 makeappx
$makeAppx = Get-ChildItem "C:\Program Files (x86)\Windows Kits\10\bin" -Recurse -Filter "makeappx.exe" -ErrorAction SilentlyContinue | 
            Where-Object { $_.FullName -match "x64" } | 
            Select-Object -First 1 -ExpandProperty FullName

if (-not $makeAppx) {
    Write-Host "错误: 找不到 makeappx.exe" -ForegroundColor Red
    exit 1
}

# 解压
$extractPath = ".\appx_check_improved"
Write-Host "`n正在解压..." -ForegroundColor Yellow

if (Test-Path $extractPath) {
    Remove-Item $extractPath -Recurse -Force
}

& $makeAppx unpack /p $AppxPath /d $extractPath /l | Out-Null

# 检查关键的 Windows x64 文件
Write-Host "`n检查 Windows x64 关键文件:" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Gray

$criticalFiles = @{
    "onnxruntime (x64)" = @{
        "patterns" = @("**/onnxruntime-node/bin/napi-v3/win32/x64/onnxruntime_binding.node", "**/onnxruntime-node/bin/napi-v3/win32/x64/onnxruntime.dll")
        "required" = $true
    }
    "sherpa-onnx (x64)" = @{
        "patterns" = @("**/sherpa-onnx-win-x64/sherpa-onnx.node", "**/sherpa-onnx-win-x64/sherpa-onnx-c-api.dll")
        "required" = $true
    }
    "sharp (x64)" = @{
        "patterns" = @("**/@img/sharp-win32-x64/**/*.node", "**/@img/sharp-win32-x64/**/libvips*.dll")
        "required" = $true
    }
    "better-sqlite3" = @{
        "patterns" = @("**/better-sqlite3/build/Release/better_sqlite3.node")
        "required" = $true
    }
    "lancedb" = @{
        "patterns" = @("**/@lancedb/lancedb-win32-x64-msvc/*.node")
        "required" = $false
    }
}

$allPassed = $true

foreach ($name in $criticalFiles.Keys) {
    $config = $criticalFiles[$name]
    Write-Host "`n检查: $name" -ForegroundColor Yellow
    
    $foundAny = $false
    foreach ($pattern in $config.patterns) {
        $files = Get-ChildItem -Path $extractPath -Recurse -Include ($pattern.Split('/')[-1]) -ErrorAction SilentlyContinue |
                 Where-Object { $_.FullName -like "*$($pattern.Replace('**/', '').Replace('/', '\'))" }
        
        if ($files) {
            $foundAny = $true
            foreach ($file in $files) {
                $relativePath = $file.FullName.Replace($extractPath, "")
                $size = "{0:N2} KB" -f ($file.Length / 1KB)
                Write-Host "  ✓ $relativePath ($size)" -ForegroundColor Green
            }
        }
    }
    
    if (-not $foundAny -and $config.required) {
        Write-Host "  ✗ 未找到必需文件" -ForegroundColor Red
        $allPassed = $false
    } elseif (-not $foundAny) {
        Write-Host "  ⚠ 未找到（非必需）" -ForegroundColor Yellow
    }
}

# 统计
Write-Host "`n" + ("=" * 80) -ForegroundColor Gray
Write-Host "统计信息:" -ForegroundColor Cyan

$allNodeFiles = Get-ChildItem -Path $extractPath -Recurse -Filter "*.node" -ErrorAction SilentlyContinue
$allDllFiles = Get-ChildItem -Path $extractPath -Recurse -Filter "*.dll" -ErrorAction SilentlyContinue

Write-Host "  总共 .node 文件: $($allNodeFiles.Count)" -ForegroundColor Gray
Write-Host "  总共 .dll 文件: $($allDllFiles.Count)" -ForegroundColor Gray

# Windows x64 特定文件
$win64NodeFiles = $allNodeFiles | Where-Object { $_.FullName -match "win32\\x64|win-x64|win32-x64" }
$win64DllFiles = $allDllFiles | Where-Object { $_.FullName -match "win32\\x64|win-x64|win32-x64" }

Write-Host "  Windows x64 .node 文件: $($win64NodeFiles.Count)" -ForegroundColor Cyan
Write-Host "  Windows x64 .dll 文件: $($win64DllFiles.Count)" -ForegroundColor Cyan

# 最终结果
Write-Host "`n" + ("=" * 80) -ForegroundColor Gray
if ($allPassed) {
    Write-Host "✓ 所有必需文件都已正确打包！" -ForegroundColor Green
    Write-Host "✓ 应用应该可以正常运行" -ForegroundColor Green
} else {
    Write-Host "✗ 缺少一些必需文件" -ForegroundColor Red
    Write-Host "建议: 检查 package.json 中的 asarUnpack 配置" -ForegroundColor Yellow
}

# 清理
$keep = Read-Host "`n是否保留解压文件? (Y/N)"
if ($keep -ne "Y" -and $keep -ne "y") {
    Remove-Item $extractPath -Recurse -Force
}

exit $(if ($allPassed) { 0 } else { 1 })