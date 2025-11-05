@echo off
chcp 65001 >nul
color 0B
setlocal EnableExtensions

echo ========================================
echo   Finance App - Cloud APK Build (EAS)
echo ========================================

cd /d "%~dp0"

where node >nul 2>&1 || (
  echo [ERROR] Node.js is required. Install from https://nodejs.org/
  pause
  exit /b 1
)

:: Ensure expo/eas CLIs are available via npx
call npx --yes expo --version || (
  echo [INFO] Installing Expo CLI via npx on-the-fly...
)
call npx --yes eas --version || (
  echo [INFO] EAS CLI will run via npx...
)

echo.
echo [1/3] Login to Expo (a browser window may open). If already logged in, press Enter in terminal when prompted.
call npx --yes expo login || (
  echo [WARN] If login failed, run this again after logging in.
)

echo.
echo [2/3] Config check (Android package name is required). If prompted, follow instructions to set it.
call npx --yes expo whoami

:: Optional: validate config
call npx --yes expo config --type public >nul 2>&1

set PROFILE=production

echo.
echo [3/3] Starting cloud build for Android APK (profile: %PROFILE%)
call npx --yes eas build -p android --profile %PROFILE% --non-interactive || (
  echo.
  echo [INFO] If non-interactive fails due to prompts, running interactive mode...
  call npx --yes eas build -p android --profile %PROFILE%
)

echo.
echo When the build finishes, EAS will give you a download URL for the APK.
endlocal
pause
