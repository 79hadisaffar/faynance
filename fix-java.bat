@echo off
chcp 65001 >nul
echo ================================================
echo      FIX JAVA - Finance App
echo ================================================
echo.

echo Checking for Java JDK 17+...
echo.

REM Clear invalid JAVA_HOME
set JAVA_HOME=

REM Try to find Java in common locations
if exist "C:\Program Files\Java\jdk-17" (
    set JAVA_HOME=C:\Program Files\Java\jdk-17
    goto :found
)

if exist "C:\Program Files\Java\jdk-21" (
    set JAVA_HOME=C:\Program Files\Java\jdk-21
    goto :found
)

if exist "C:\Program Files\Eclipse Adoptium\jdk-17" (
    set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17
    goto :found
)

if exist "C:\Program Files\Eclipse Adoptium\jdk-21" (
    set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21
    goto :found
)

REM Check Program Files (x86)
if exist "C:\Program Files (x86)\Java\jdk-17" (
    set JAVA_HOME=C:\Program Files (x86)\Java\jdk-17
    goto :found
)

echo [ERROR] Java JDK 17+ not found!
echo.
echo Please install Java JDK 17 or higher:
echo Download: https://adoptium.net/temurin/releases/
echo.
echo After installation, run this file again.
echo.
pause
exit /b 1

:found
echo [SUCCESS] Found Java at: %JAVA_HOME%
echo.

REM Verify Java version
"%JAVA_HOME%\bin\java.exe" -version
echo.

REM Set JAVA_HOME permanently
echo Setting JAVA_HOME permanently...
setx JAVA_HOME "%JAVA_HOME%"
echo.

echo [SUCCESS] Java configured successfully!
echo.
echo You can now run: build-apk.bat
echo.
pause
