$proj = "C:\Users\hadi\New folder (2)\FinanceApp"
$gradleProps = Join-Path $proj 'android\gradle.properties'
if(-not (Test-Path $gradleProps)){
    Write-Error "gradle.properties not found at $gradleProps"
    exit 1
}
$line = Get-Content $gradleProps | Select-String -Pattern '^org\.gradle\.java\.home=' | Select-Object -First 1
if(-not $line){ Write-Error "org.gradle.java.home not set in $gradleProps"; exit 2 }
$javaHome = $line.ToString().Split('=')[1].Trim()
Write-Host "Using JAVA_HOME:" $javaHome

$log = Join-Path $proj 'gradle-build.log'
Push-Location (Join-Path $proj 'android')
$env:JAVA_HOME = $javaHome
$env:PATH = (Join-Path $javaHome 'bin') + ';' + $env:PATH
Write-Host "Attempting assembleRelease (no mirrors) (logs -> $log)"
try {
    .\gradlew.bat assembleRelease --no-daemon --stacktrace *>&1 | Tee-Object -FilePath $log
} catch {
    Write-Host "assembleRelease failed without mirrors."
}

if (-not (Test-Path (Join-Path $proj 'android\app\build\outputs\apk\release\app-release.apk'))) {
    Write-Host "Retrying with mirrors and refresh-dependencies..."
    try {
        .\gradlew.bat -I "..\maven-mirrors.gradle" --refresh-dependencies --no-daemon --stacktrace assembleRelease *>&1 | Tee-Object -FilePath $log
    } catch {
        Write-Host "assembleRelease with mirrors failed."
    }
}

if (-not (Test-Path (Join-Path $proj 'android\app\build\outputs\apk\release\app-release.apk'))) {
    Write-Host "Falling back to assembleDebug (no mirrors)..."
    try {
        .\gradlew.bat assembleDebug --no-daemon --stacktrace *>&1 | Tee-Object -FilePath $log
    } catch {
        Write-Host "assembleDebug failed without mirrors."
    }
}

if (-not (Test-Path (Join-Path $proj 'android\app\build\outputs\apk\debug\app-debug.apk'))) {
    Write-Host "Retrying assembleDebug with mirrors..."
    try {
        .\gradlew.bat -I "..\maven-mirrors.gradle" --refresh-dependencies --no-daemon --stacktrace assembleDebug *>&1 | Tee-Object -FilePath $log
    } catch {
        Write-Host "assembleDebug with mirrors failed."
    }
}
Pop-Location

if(Test-Path (Join-Path $proj 'android\app\build\outputs\apk\release\app-release.apk')){
    Write-Host "APK built:" (Join-Path $proj 'android\app\build\outputs\apk\release\app-release.apk')
    exit 0
} elseif (Test-Path (Join-Path $proj 'android\app\build\outputs\apk\debug\app-debug.apk')) {
    Write-Host "Debug APK built:" (Join-Path $proj 'android\app\build\outputs\apk\debug\app-debug.apk')
    exit 0
} else {
    Write-Host "APK not found. Tail of log (last 200 lines):"
    Get-Content -Path $log -Tail 200 -ErrorAction SilentlyContinue | ForEach-Object { Write-Host $_ }
    exit 3
}
