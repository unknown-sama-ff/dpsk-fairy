# FAIRY Ⅲ —— DeepSeek Harness 皮肤一键安装
# 用法（仓库目录内）：  powershell -ExecutionPolicy Bypass -File .\install.ps1
# 用法（一行远程）：    powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/unknown-sama-ff/dpsk-fairy/main/install.ps1 | iex"
#Requires -Version 5.1

param([string]$ProfileRoot = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop'))

$ErrorActionPreference = 'Stop'
$repoSlug = 'unknown-sama-ff/dpsk-fairy'
$bundleId = '@local/dsh-fairy-mode'
$bundleDirName = 'dsh-fairy-mode'

function Write-Step([string]$message) { Write-Host "  → $message" -ForegroundColor Cyan }
function Fail([string]$message) { Write-Host $message -ForegroundColor Red; exit 1 }

Write-Host ''
Write-Host 'FAIRY Ⅲ · DeepSeek Harness HDD 皮肤安装器' -ForegroundColor Magenta
Write-Host ''

# 1. DSH profile
$profileRoot = $ProfileRoot
if (-not (Test-Path (Join-Path $profileRoot 'package.json'))) {
  Fail "找不到 DSH 桌面端 profile：$profileRoot`n请先安装并启动一次 DeepSeek Harness，再运行本脚本。"
}
Write-Step "profile: $profileRoot"

# 2. 插件来源：本地仓库目录，或从 GitHub 下载
$source = ''
if ($PSScriptRoot) {
  $candidate = Join-Path $PSScriptRoot 'fairy-mode'
  if (Test-Path (Join-Path $candidate 'package.json')) { $source = $candidate }
}
if ($source -eq '') {
  $temp = Join-Path $env:TEMP ('dpsk-fairy-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $temp | Out-Null
  $zip = Join-Path $temp 'repo.zip'
  Write-Step '下载皮肤包…'
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/$repoSlug/zip/refs/heads/main" -OutFile $zip
  } catch {
    Fail "下载失败：$($_.Exception.Message)`n请检查网络，或手动克隆仓库后运行 .\install.ps1。"
  }
  Expand-Archive -LiteralPath $zip -DestinationPath $temp -Force
  $source = (Get-ChildItem -LiteralPath $temp -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName 'fairy-mode\package.json') } |
    Select-Object -First 1).FullName
  if (-not $source) { Fail '下载的压缩包里没有找到 fairy-mode 目录。' }
  $source = Join-Path $source 'fairy-mode'
}
Write-Step "插件源: $source"

# 3. 复制到稳定位置
$target = Join-Path $env:USERPROFILE ".dsh\bundles\$bundleDirName"
$bundlesRoot = Split-Path $target -Parent
New-Item -ItemType Directory -Force -Path $bundlesRoot | Out-Null
if (Test-Path $target) { Remove-Item -LiteralPath $target -Recurse -Force }
Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
Write-Step "安装到: $target"

# 4. 登记到 profile
$pkgPath = Join-Path $profileRoot 'package.json'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
Copy-Item -LiteralPath $pkgPath -Destination "$pkgPath.bak-$stamp" -Force
$pkg = Get-Content -LiteralPath $pkgPath -Raw -Encoding UTF8 | ConvertFrom-Json
$linkPath = ($target -replace '\\', '/')
if (-not $pkg.dependencies) { $pkg | Add-Member -MemberType NoteProperty -Name dependencies -Value ([pscustomobject]@{}) }
$pkg.dependencies | Add-Member -MemberType NoteProperty -Name $bundleId -Value ("link:" + $linkPath) -Force
if (-not $pkg.dsh) { $pkg | Add-Member -MemberType NoteProperty -Name dsh -Value ([pscustomobject]@{}) }
if (-not $pkg.dsh.profile) { $pkg.dsh | Add-Member -MemberType NoteProperty -Name profile -Value ([pscustomobject]@{}) }
$bundles = @()
if ($pkg.dsh.profile.bundles) { $bundles = @($pkg.dsh.profile.bundles) }
if ($bundles -notcontains $bundleId) { $bundles += $bundleId }
$pkg.dsh.profile | Add-Member -MemberType NoteProperty -Name bundles -Value $bundles -Force
$json = $pkg | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($pkgPath, $json, (New-Object System.Text.UTF8Encoding($false)))
Write-Step "已写入 profile（备份在 package.json.bak-$stamp）"

# 5. 建立链接
$scopeDir = Join-Path $profileRoot 'node_modules\@local'
New-Item -ItemType Directory -Force -Path $scopeDir | Out-Null
$junction = Join-Path $scopeDir $bundleDirName
if (Test-Path $junction) { Remove-Item -LiteralPath $junction -Recurse -Force }
New-Item -ItemType Junction -Path $junction -Target $target | Out-Null
Write-Step "已链接: node_modules\@local\$bundleDirName"

Write-Host ''
Write-Host '安装完成。' -ForegroundColor Green
Write-Host '请完全退出 DeepSeek Harness（托盘也要退出）后重新启动，皮肤会在启动动画后生效。' -ForegroundColor Yellow
Write-Host ''
Write-Host '语音：默认走系统 edge-tts（已内置）；如果你本地装了 GPT-SoVITS，可在 profile 的 cordis.patch.yml 里配置 tts。'
Write-Host '卸载：运行同目录下的 uninstall.ps1。'
Write-Host ''
