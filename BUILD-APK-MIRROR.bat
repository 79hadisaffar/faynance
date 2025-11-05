@echo off
chcp 65001 >nul
color 0A
setlocal EnableExtensions EnableDelayedExpansion

echo ========================================
echo   Finance App - APK via Maven Mirrors
echo ========================================

cd /d "%~dp0"

REM Detect JDK 17 (Android Studio JBR or common JDK17); fallback to PATH
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if not exist "%JAVA_HOME%\bin\java.exe" set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17"
if not exist "%JAVA_HOME%\bin\java.exe" set "JAVA_HOME=C:\Program Files\Java\jdk-17"
if exist "%JAVA_HOME%\bin\java.exe" (
  set "PATH=%JAVA_HOME%\bin;%PATH%"
  echo Using JAVA_HOME: %JAVA_HOME%
) else (
  echo [WARN] JDK 17 not found in default paths. Using system Java on PATH.
)

set "GRADLE_USER_HOME=%cd%\.gradle-cache"
if not exist "%GRADLE_USER_HOME%" mkdir "%GRADLE_USER_HOME%" >nul 2>&1

set "INIT_SCRIPT=%cd%\maven-mirrors.gradle"
if not exist "%INIT_SCRIPT%" (
  echo [ERROR] Mirror init script not found: %INIT_SCRIPT%
  echo Make sure maven-mirrors.gradle exists in project root.
  pause
  exit /b 1
)

echo Java version in use:
java -version

echo Starting build with mirrors...
cd android
if not exist "gradlew.bat" (
  echo [ERROR] Android folder not ready (missing gradlew.bat). Run: SETUP-FIRST.bat
  cd ..
  pause
  exit /b 1
)

REM Use mirrors init script, refresh deps, and force JDK if available
if defined JAVA_HOME (
  call gradlew.bat -I "%INIT_SCRIPT%" -Dorg.gradle.java.home="%JAVA_HOME%" --refresh-dependencies --no-daemon --stacktrace assembleRelease
) else (
  call gradlew.bat -I "%INIT_SCRIPT%" --refresh-dependencies --no-daemon --stacktrace assembleRelease
)
set "ERR=%ERRORLEVEL%"
cd ..

echo.
if "%ERR%"=="0" (
  if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo SUCCESS! APK ready:
    echo   android\app\build\outputs\apk\release\app-release.apk
    start explorer.exe "android\app\build\outputs\apk\release"
    endlocal
    pause
    exit /b 0
  ) else (
    echo [WARN] Build finished but APK not found at expected path.
    endlocal
    pause
    exit /b 2
  )
) else (
  echo Build failed with exit code %ERR%.
  echo If the error mentions network or 404, the mirrors may be blocked too. Try a VPN or use build-cloud.bat (EAS).
  endlocal
  pause
  exit /b %ERR%
)
