@echo off
cd /d "%~dp0"
echo ================================================
echo    Run with Expo Go (no APK needed)
echo ================================================
echo.
echo This is the easiest way:
echo 1. Install Expo Go from Google Play
echo 2. Run this script
echo 3. Scan QR Code with Expo Go
echo.
echo ================================================
echo.
pause

echo Starting Expo server...
echo.
echo After starting:
echo - A QR Code will be displayed
echo - Scan it with Expo Go on your phone
echo - The app will open on your phone
echo.
echo To stop server: Ctrl+C
echo.
pause

call npx expo start

pause
