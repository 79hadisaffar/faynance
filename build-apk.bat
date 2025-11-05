@echo off
cd /d "%~dp0"
cls
echo ================================================
echo      BUILD APK - Finance App
echo ================================================
echo.
echo Building APK file...
echo Please wait...
echo.

REM Check if android folder exists
if not exist "android\" (
    echo [1/3] Preparing Android project...
    echo.
    call npx expo prebuild --platform android --clean
    if errorlevel 1 (
        echo.
        echo ERROR: Prebuild failed!
        echo.
        echo Node.js may not be installed.
        echo Download: https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
    echo OK: Project prepared!
    echo.
)

REM Check if gradlew exists
if not exist "android\gradlew.bat" (
    echo ERROR: gradlew.bat not found!
    echo.
    pause
    exit /b 1
)

echo [2/3] Building APK...
echo This may take 5-10 minutes.
echo.

cd android
call gradlew.bat assembleRelease --no-daemon --warning-mode none
set BUILD_RESULT=%errorlevel%
cd ..

if %BUILD_RESULT% neq 0 (
    echo.
    echo ================================================
    echo ERROR: APK build failed!
    echo ================================================
    echo.
    echo Java JDK may not be installed or is outdated.
    echo.
    echo Required: Java JDK 17 or higher
    echo Download: https://adoptium.net/temurin/releases/
    echo.
    echo After installing Java, run this file again.
    echo.
    pause
    exit /b 1
)

REM Check if APK was created
if not exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo ERROR: APK file was not created!
    pause
    exit /b 1
)

cls
echo ================================================
echo    SUCCESS! APK Created!
echo ================================================
echo.
echo File location:
echo %CD%\android\app\build\outputs\apk\release\app-release.apk
echo.
echo File size:
for %%A in ("android\app\build\outputs\apk\release\app-release.apk") do (
    set /a SIZE_MB=%%~zA/1024/1024
    echo %%~zA bytes (approximately !SIZE_MB! MB^)
)
echo.
echo ================================================
echo    How to install on phone:
echo ================================================
echo.
echo 1. Transfer app-release.apk to your phone
echo    (via USB, Telegram, or Bluetooth)
echo.
echo 2. On phone: Settings ^> Security ^> Unknown Sources
echo    Enable it
echo.
echo 3. Click on APK file on phone
echo.
echo 4. Install!
echo.
echo ================================================
echo.

REM Open folder in explorer
start "" explorer "%CD%\android\app\build\outputs\apk\release\"

pause
