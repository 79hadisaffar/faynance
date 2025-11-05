@echo off
echo ==========================================
echo Building APK - Please Wait
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo OK
echo.

echo [2/4] Checking Java...
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Java not found!
    echo Please install Java JDK 17 from: https://adoptium.net/
    pause
    exit /b 1
)
java -version
echo OK
echo.

echo [3/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo OK
echo.

echo [4/4] Building Android project...
if not exist "android" (
    echo Creating Android project...
    call npx expo prebuild --platform android
    if %errorlevel% neq 0 (
        echo ERROR: Expo prebuild failed!
        pause
        exit /b 1
    )
)
echo.

echo Building APK (this will take 5-10 minutes)...
cd android
call gradlew.bat assembleRelease --no-daemon
if %errorlevel% neq 0 (
    echo.
    echo ==========================================
    echo ERROR: Build failed!
    echo ==========================================
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ==========================================
echo SUCCESS! APK Created!
echo ==========================================
echo.
echo APK Location:
echo android\app\build\outputs\apk\release\app-release.apk
echo.
echo You can now install this APK on any Android phone!
echo.
pause
