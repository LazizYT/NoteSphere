@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title NoteSphere OS - Windows Installer Builder
color 0B

:: Переход в директорию скрипта с защитой от спецсимволов (& в пути)
cd /d "%~dp0"

echo ================================================================
echo       NOTESPHERE OS -- СБОРКА УСТАНОВОЧНОГО ФАЙЛА (EXE)
echo ================================================================
echo.

:: 1. Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ОШИБКА] Node.js не найден в системе! Пожалуйста, установите Node.js LTS.
    pause
    exit /b 1
)

echo [1/3] Очистка предыдущих сборок...
if exist "dist" rmdir /s /q "dist" >nul 2>nul
if exist "release\NoteSphere-OS-Setup-*.exe" del /f /q "release\NoteSphere-OS-Setup-*.exe" >nul 2>nul
if exist "release\NoteSphere-OS-Portable-*.exe" del /f /q "release\NoteSphere-OS-Portable-*.exe" >nul 2>nul

echo [2/3] Компиляция интерфейса (Vite) и сервера (esbuild)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ОШИБКА] Сборка фронтенда или сервера завершилась неудачей!
    echo.
    pause
    exit /b 1
)

echo.
echo [3/3] Упаковка в Windows EXE (electron-builder)...
call node "node_modules\electron-builder\out\cli\cli.js" --win
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ОШИБКА] Не удалось создать exe-файлы через electron-builder!
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
color 0A
echo   [УСПЕХ] Сборка успешно завершена!
echo.
if exist "release\NoteSphere-OS-Setup-1.0.0.exe" echo   [1] Установочный файл Setup: "%~dp0release\NoteSphere-OS-Setup-1.0.0.exe"
if exist "release\NoteSphere-OS-Portable-1.0.0.exe" echo   [2] Портативная версия: "%~dp0release\NoteSphere-OS-Portable-1.0.0.exe"
echo.
echo ================================================================
echo.
pause