# deploy.ps1 - Деплой sud.cvr.name
# Usage:
#   .\deploy.ps1                         # build + upload
#   .\deploy.ps1 -BuildOnly              # only build
#   .\deploy.ps1 -UploadOnly             # only upload
#   .\deploy.ps1 -Server myserver.com -User admin

param(
  [switch]$BuildOnly,
  [switch]$UploadOnly,
  [string]$Server = "130.49.175.224",
  [string]$User = "user0",
  [string]$ServerPath = "/var/www/sud.cvr.name"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Deploy sud.cvr.name ===" -ForegroundColor Cyan
Write-Host "Server: $Server" -ForegroundColor Gray
Write-Host "Path: $ServerPath" -ForegroundColor Gray

# Build
if (-not $UploadOnly) {
  Write-Host "`n[1/3] Building..." -ForegroundColor Yellow
  npm run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed" }
  Write-Host "Build OK" -ForegroundColor Green
}

# Upload
if (-not $BuildOnly) {
  Write-Host "`n[2/3] Uploading dist/ to server..." -ForegroundColor Yellow
  scp -r dist/* "${User}@${Server}:${ServerPath}/dist/"
  if ($LASTEXITCODE -ne 0) { throw "Upload failed" }
  # Upload sitemap.xml to server root (required by robots.txt)
  scp dist/sitemap.xml "${User}@${Server}:${ServerPath}/sitemap.xml"
  if ($LASTEXITCODE -ne 0) { throw "Sitemap upload failed" }
  Write-Host "Upload OK" -ForegroundColor Green

  # Verify sitemap
  Write-Host "`n[3/3] Verifying sitemap.xml..." -ForegroundColor Yellow
  $sitemapUrl = "https://sud.cvr.name/sitemap.xml"
  try {
    $resp = Invoke-WebRequest -Uri $sitemapUrl -Method HEAD -TimeoutSec 10
    if ($resp.StatusCode -eq 200) {
      Write-Host "sitemap.xml OK (HTTP $($resp.StatusCode))" -ForegroundColor Green
    } else {
      Write-Host "sitemap.xml warning: HTTP $($resp.StatusCode)" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "sitemap.xml check failed: $_" -ForegroundColor Yellow
  }
}

Write-Host "`n=== Deploy complete ===" -ForegroundColor Cyan