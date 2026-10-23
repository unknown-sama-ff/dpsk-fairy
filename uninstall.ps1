# FAIRY Ⅲ —— 卸载脚本
# 用法：powershell -ExecutionPolicy Bypass -File .\uninstall.ps1 [-KeepFiles]
#Requires -Version 5.1

param([switch]$KeepFiles, [string]$ProfileRoot = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop'))

$ErrorActionPreference = 'Stop'
$bundleId = '@local/dsh-fairy-mode'
$bundleDirName = 'dsh-fairy-mode'

$profileRoot = $ProfileRoot
if (-not (Test-Path (Join-Path $profileRoot 'package.json'))) {
  Write-Host "找不到 DSH profile：$profileRoot" -ForegroundColor Red
  exit 1
}

$pkgPath = Join-Path $profileRoot 'package.json'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item -LiteralPath $pkgPath -Destination "$pkgPath.bak-$stamp" -Force

$pkg = Get-Content -LiteralPath $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($pkg.dependencies -and $pkg.dependencies.PSObject.Properties.Name -contains $bundleId) {
  $pkg.dependencies.PSObject.Properties.Remove($bundleId)
}
if ($pkg.dsh -and $pkg.dsh.profile -and $pkg.dsh.profile.bundles) {
  $kept = @($pkg.dsh.profile.bundles | Where-Object { $_ -ne $bundleId })
  $pkg.dsh.profile.bundles = $kept
}
$json = $pkg | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($pkgPath, $json, (New-Object System.Text.UTF8Encoding($false)))

$junction = Join-Path $profileRoot "node_modules\@local\$bundleDirName"
if (Test-Path $junction) { Remove-Item -LiteralPath $junction -Recurse -Force }

$target = Join-Path $env:USERPROFILE ".dsh\bundles\$bundleDirName"
if (-not $KeepFiles -and (Test-Path $target)) { Remove-Item -LiteralPath $target -Recurse -Force }

Write-Host '已卸载 FAIRY Ⅲ 皮肤。完全退出 DeepSeek Harness 后重新启动即可恢复原界面。' -ForegroundColor Green
