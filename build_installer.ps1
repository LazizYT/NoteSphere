$ErrorActionPreference = "Stop"
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "      NOTESPHERE OS -- СБОРКА УСТАНОВОЧНОГО ФАЙЛА (EXE)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ОШИБКА] Node.js не найден в системе!" -ForegroundColor Red
    Pause
    exit 1
}

Set-Location -Path $PSScriptRoot

# 1/3 Очистка
Write-Host "[1/3] Очистка предыдущих сборок..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
Get-ChildItem -Path "release" -Filter "NoteSphere-OS-Setup-*.exe" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path "release" -Filter "NoteSphere-OS-Portable-*.exe" -ErrorAction SilentlyContinue | Remove-Item -Force

# 2/3 Компиляция Vite + esbuild
Write-Host "[2/3] Компиляция интерфейса (Vite) и сервера (esbuild)..." -ForegroundColor Yellow
& npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Сборка фронтенда или сервера завершилась неудачей!" -ForegroundColor Red
    Pause
    exit 1
}

# 3/3 electron-builder
Write-Host ""
Write-Host "[3/3] Упаковка в Windows EXE (electron-builder)..." -ForegroundColor Yellow
& node "node_modules/electron-builder/out/cli/cli.js" --win
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ОШИБКА] Не удалось создать exe-файлы через electron-builder!" -ForegroundColor Red
    Pause
    exit 1
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
$setupExe = Get-ChildItem -Path "release" -Filter "NoteSphere-OS-Setup-*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
$portableExe = Get-ChildItem -Path "release" -Filter "NoteSphere-OS-Portable-*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1

Write-Host "  [УСПЕХ] Сборка успешно завершена!" -ForegroundColor Green
Write-Host ""
if ($setupExe) {
    Write-Host "  [1] Установщик (Setup):" -ForegroundColor Green
    Write-Host "      $($setupExe.FullName)" -ForegroundColor Cyan
}
if ($portableExe) {
    Write-Host "  [2] Портативная версия (запуск БЕЗ установки и распаковки):" -ForegroundColor Green
    Write-Host "      $($portableExe.FullName)" -ForegroundColor Cyan
}
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Pause