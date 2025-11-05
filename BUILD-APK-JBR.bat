@echo off
chcp 65001 >nul
color 0A
setlocal EnableExtensions

echo.
echo ========================================
echo    Finance App - APK with Android Studio JBR
echo ========================================

echo Using Android Studio bundled JDK (JBR)...
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [ERROR] Android Studio JBR not found at:
  echo         %JAVA_HOME%
  echo Install Android Studio or install Temurin JDK 17 (LTS).
  pause
  exit /b 1
)

set "PATH=%JAVA_HOME%\bin;%PATH%"

echo Switching to android folder...
cd /d "%~dp0android"

if not exist "gradlew.bat" (
  echo [ERROR] Android folder not ready! Run: SETUP-FIRST.bat
  pause
  exit /b 1
)

echo Java version:
java -version

echo Building release APK... (this may take several minutes)
call gradlew.bat -Dorg.gradle.java.home="%JAVA_HOME%" assembleRelease --no-daemon --stacktrace
set "ERR=%ERRORLEVEL%"
cd ..

echo.
if "%ERR%"=="0" (
  if exist "android\app\build\outputs\apk\release\app-release.apk" (
    echo SUCCESS! APK ready at:
    echo   android\app\build\outputs\apk\release\app-release.apk
    start explorer.exe "android\app\build\outputs\apk\release"
    endlocal
    pause
    exit /b 0
  ) else (
    echo [WARN] Build finished but APK not found.
    endlocal
    pause
    exit /b 2
  )
) else (
  echo Build failed (exit code %ERR%). See errors above.
  endlocal
  pause
  exit /b %ERR%
)
