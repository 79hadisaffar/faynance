# PowerShell script to download GitHub Actions artifact, extract APKs and publish a GitHub Release
# Usage: run in project root where package.json exists; ensure $env:GITHUB_PAT is set

param()

$ErrorActionPreference = 'Stop'

$owner = '79hadisaffar'
$repo = 'faynance'
$token = $env:GITHUB_PAT
if (-not $token) {
    Write-Error 'GITHUB_PAT environment variable is not set. Set $env:GITHUB_PAT and re-run.'
    exit 1
}
$headers = @{ Authorization = "token $token"; 'User-Agent' = 'ReleaseUploaderScript' }

# Read version from package.json
$pkgPath = Join-Path (Get-Location) 'package.json'
if (-not (Test-Path $pkgPath)) { Write-Error 'package.json not found in current directory'; exit 1 }
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$version = $pkg.version -as [string]
if (-not $version) { Write-Error 'version not found in package.json'; exit 1 }
if ($version -match '^v') { $tag = $version } else { $tag = "v$version" }

Write-Host "Using tag: $tag"

# 1) List artifacts
$artifactsApi = "https://api.github.com/repos/$owner/$repo/actions/artifacts"
Write-Host 'Fetching artifacts list...'
$artifactsResp = Invoke-RestMethod -Uri $artifactsApi -Headers $headers -Method Get
if (($artifactsResp.total_count -as [int]) -eq 0) { Write-Error 'No artifacts found for this repository'; exit 1 }

# Prefer artifact named app-release-apks, otherwise take the most recent
$artifact = $artifactsResp.artifacts | Where-Object { $_.name -eq 'app-release-apks' } | Select-Object -First 1
if (-not $artifact) { $artifact = $artifactsResp.artifacts | Sort-Object created_at -Descending | Select-Object -First 1 }
Write-Host "Selected artifact: $($artifact.name) (id: $($artifact.id))"

# 2) Download artifact ZIP
$artifactId = $artifact.id
$downloadUrl = "https://api.github.com/repos/$owner/$repo/actions/artifacts/$artifactId/zip"
$zipPath = Join-Path (Get-Location) "artifact_$artifactId.zip"
Write-Host "Downloading artifact to $zipPath... (this may take a while)"
Invoke-WebRequest -Uri $downloadUrl -Headers $headers -OutFile $zipPath -UseBasicParsing
Write-Host 'Download complete.'

# 3) Extract
$extractDir = Join-Path (Get-Location) 'apk-artifact'
if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
Write-Host "Extracting to $extractDir..."
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
Write-Host 'Extraction complete.'

# 4) Find APK / AAB files
$apkFiles = Get-ChildItem -Path $extractDir -Recurse -Include *.apk, *.aab | Select-Object -ExpandProperty FullName
if (-not $apkFiles -or $apkFiles.Count -eq 0) { Write-Error 'No APK or AAB files found in artifact'; exit 1 }
Write-Host "Found $($apkFiles.Count) APK/AAB file(s):"
$apkFiles | ForEach-Object { Write-Host " - $_" }

# 5) Create GitHub Release (published)
$releaseApi = "https://api.github.com/repos/$owner/$repo/releases"
$releaseBody = @{ tag_name = $tag; name = "FinanceApp $tag"; body = "Automated release (APK) uploaded by script."; draft = $false; prerelease = $false } | ConvertTo-Json -Depth 6
Write-Host "Creating Release $tag..."
$release = Invoke-RestMethod -Uri $releaseApi -Headers $headers -Method Post -Body $releaseBody -ContentType 'application/json'
$releaseId = $release.id
Write-Host "Release created: id=$releaseId, html_url=$($release.html_url)"

# 6) Upload assets
$uploadUrlTemplate = $release.upload_url # templated: .../assets{?name,label}
$uploadBase = $uploadUrlTemplate -replace '\{\?name,label\}$',''
$uploaded = @()
foreach ($file in $apkFiles) {
    $fileName = [System.IO.Path]::GetFileName($file)
    $uploadUrl = "$uploadBase?name=$fileName"
    Write-Host "Uploading $fileName to $uploadUrl ..."
    # choose content-type for apk/aab
    $contentType = 'application/vnd.android.package-archive'
    Invoke-RestMethod -Uri $uploadUrl -Headers @{ Authorization = "token $token"; 'User-Agent'='ReleaseUploaderScript'; 'Content-Type' = $contentType } -Method Post -InFile $file
    Write-Host "Uploaded $fileName"
    $uploaded += $fileName
}

# 7) Fetch release to get asset URLs
$releaseFull = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$releaseId" -Headers $headers -Method Get
Write-Host 'Uploaded assets:'
$releaseFull.assets | ForEach-Object { Write-Host " - $($_.name): $($_.browser_download_url)" }

Write-Host "Release published: $($release.html_url)"
Write-Host 'All done. Please remove your PAT from environment when finished:'
Write-Host "Remove-Item Env:\\GITHUB_PAT"

exit 0
