@echo off
chcp 65001 >nul
color 0B
title Setup Android

echo.
echo ========================================
echo    Finance App - Android Setup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Installing packages...
call npm install
echo.

echo [2/3] Creating Android project...
call npx expo prebuild --platform android --clean
echo.

echo [3/3] Done!
echo.
echo ========================================
echo    Setup Complete!
echo ========================================
echo.
echo Now you can run: MAKE-APK.bat
echo.
pause
