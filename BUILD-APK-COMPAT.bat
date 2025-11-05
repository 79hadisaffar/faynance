@echo off
chcp 65001 >nul
color 0A
setlocal EnableExtensions EnableDelayedExpansion

echo ========================================
echo   Finance App - Robust APK Builder
echo ========================================

echo [0] Switch to project directory
cd /d "%~dp0"

set "FOUND_JDK="

REM [1] Prefer portable JDK inside project (created by setup-portable-jdk)
if exist "portable-jdk" (
  for /d %%D in ("portable-jdk\*") do if exist "%%~fD\bin\java.exe" set "FOUND_JDK=%%~fD"
  if defined FOUND_JDK goto :FoundJdk
)

REM [2] Common JDK 17 locations
for /d %%J in ("C:\Program Files\Eclipse Adoptium\jdk-17*") do set "FOUND_JDK=%%~fJ"
if defined FOUND_JDK goto :FoundJdk
for /d %%J in ("C:\Program Files\Java\jdk-17*") do set "FOUND_JDK=%%~fJ"
if defined FOUND_JDK goto :FoundJdk

REM [3] Android Studio bundled JBR (often JDK 17)
if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" set "FOUND_JDK=C:\Program Files\Android\Android Studio\jbr"

:FoundJdk
if not defined FOUND_JDK (
  echo [ERROR] No JDK 17 found.
  echo - Install Temurin JDK 17 (LTS) from https://adoptium.net/temurin/releases/
  echo - Or run: run-setup-portable-jdk.bat (downloads portable JDK 17 into the project)
  echo.
  pause
  exit /b 1
)

echo [1] Using JDK: %FOUND_JDK%
set "JAVA_HOME=%FOUND_JDK%"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo     (Java version below)
java -version

echo.
echo [2] Building APK (this may take 5-10 minutes)...
cd android

REM Force Gradle to use our JDK regardless of gradle.properties
call gradlew.bat -Dorg.gradle.java.home="%JAVA_HOME%" assembleRelease --no-daemon --stacktrace
set "ERR=%ERRORLEVEL%"
cd ..

echo.
if "%ERR%"=="0" (
  if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo ========================================
    echo   SUCCESS! APK is ready
    echo ========================================
    echo File:
    echo   android\app\build\outputs\apk\release\app-release.apk
    start explorer.exe "android\app\build\outputs\apk\release"
    endlocal
    pause
    exit /b 0
  ) else (
    echo [WARN] Build finished but APK not found where expected.
    echo       Check Gradle output above for variant/task details.
    endlocal
    pause
    exit /b 2
  )
) else (
  echo ========================================
  echo   Build failed (exit code %ERR%)
  echo ========================================
  echo If you saw 'Unsupported class file major version 69', it means JDK 25 was used.
  echo Ensure the detected JDK above is 17.x and try again.
  endlocal
  pause
  exit /b %ERR%
)
