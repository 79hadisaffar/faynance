@echo off
chcp 65001 >nul
color 0A
title Building APK

echo.
echo ========================================
echo    Finance App - APK Builder
echo ========================================
echo.
echo Please wait, building your app...
echo This may take 5-10 minutes.
echo.

cd /d "%~dp0android"

if not exist "gradlew.bat" (
    echo ERROR: Android folder not ready!
    echo.
    echo Please run: npx expo prebuild --platform android
    echo.
    pause
    exit
)

echo Starting build...
echo.

REM Prefer Android Studio JBR (JDK 17). Fallback to common JDK 17 locations. If none found, use system Java on PATH.
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if not exist "%JAVA_HOME%\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17"
)
if not exist "%JAVA_HOME%\bin\java.exe" (
    set "JAVA_HOME=C:\Program Files\Java\jdk-17"
)
if not exist "%JAVA_HOME%\bin\java.exe" (
    echo [WARN] JDK 17 not found at default locations. Falling back to system Java on PATH.
    set "JAVA_HOME="
) else (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)

echo Java version in use:
java -version

set "GRADLE_ARGS=--no-daemon --stacktrace --refresh-dependencies -I repo-mirrors.init.gradle"

if defined JAVA_HOME (
    call gradlew.bat -Dorg.gradle.java.home="%JAVA_HOME%" assembleRelease %GRADLE_ARGS%
)
if not defined JAVA_HOME (
    call gradlew.bat assembleRelease %GRADLE_ARGS%
)

if exist "app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo ========================================
    echo    SUCCESS! APK is ready!
    echo ========================================
    echo.
    echo File location:
    echo app\build\outputs\apk\release\app-release.apk
    echo.
    start explorer.exe "app\build\outputs\apk\release"
) else (
    echo.
    echo ========================================
    echo    Build failed! 
    echo ========================================
    echo.
)

pause
