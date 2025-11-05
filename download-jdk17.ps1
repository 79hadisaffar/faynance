$ErrorActionPreference='Stop'
$dest = Join-Path $PSScriptRoot 'jdk17.zip'
Write-Output "Querying GitHub releases for Temurin 17..."
$api = 'https://api.github.com/repos/adoptium/temurin17-binaries/releases/latest'
$rel = Invoke-RestMethod -Uri $api -UseBasicParsing
$asset = $rel.assets | Where-Object { $_.name -match 'OpenJDK17U-jdk_x64_windows_hotspot.*zip$' } | Select-Object -First 1
if(-not $asset){ Write-Error 'Could not find Temurin 17 asset in GitHub release.'; exit 2 }
$uri = $asset.browser_download_url
Write-Output "Found asset: $($asset.name)"
Write-Output "Downloading $uri to $dest ..."
Invoke-WebRequest -Uri $uri -OutFile $dest
Write-Output "Downloaded to: $dest"
$destDir = Join-Path $PSScriptRoot 'jdk17'
if(Test-Path $destDir){ Remove-Item $destDir -Recurse -Force }
Write-Output "Extracting to $destDir ..."
Expand-Archive -Path $dest -DestinationPath $destDir -Force
Write-Output "Extracted to: $destDir"
Get-ChildItem $destDir -Directory | ForEach-Object { Write-Output $_.FullName }
