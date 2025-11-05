$proj = "C:\Users\hadi\New folder (2)\FinanceApp"
$zip = Join-Path $proj 'temurin17.zip'
$dest = Join-Path $proj 'portable-jdk'
$url = 'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse'

Write-Host "Downloading Temurin JDK 17 from: $url"
try{
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing -ErrorAction Stop
    Write-Host "Downloaded to: $zip"
}catch{
    Write-Error "Download failed: $_"
    exit 2
}

Write-Host "Extracting to: $dest"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $dest
try{
    Expand-Archive -Path $zip -DestinationPath $dest -Force -ErrorAction Stop
}catch{
    Write-Error "Extract failed: $_"
    exit 3
}

$jdkDir = Get-ChildItem -Path $dest -Directory | Select-Object -First 1
if(-not $jdkDir){ Write-Error "Could not find extracted JDK directory"; exit 4 }
$javaHome = $jdkDir.FullName
Write-Host "Extracted JDK home: $javaHome"

$gradleProps = Join-Path $proj 'android\gradle.properties'
if(-not (Test-Path $gradleProps)){
    Write-Host "Creating gradle.properties at: $gradleProps"
    New-Item -Path $gradleProps -ItemType File -Force | Out-Null
}

# Remove any existing org.gradle.java.home lines and append new one
$existing = Get-Content -Path $gradleProps -ErrorAction SilentlyContinue
$filtered = $existing | Where-Object { $_ -notmatch '^org.gradle.java.home=' }
$filtered | Set-Content -Path $gradleProps
Add-Content -Path $gradleProps -Value "org.gradle.java.home=$javaHome"
Write-Host "Wrote 'org.gradle.java.home' to $gradleProps"

Write-Host "Done. Next run the build script: run-gradle-with-portable.ps1"
