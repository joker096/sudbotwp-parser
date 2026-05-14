# deploy.ps1 - Деплой parse-all-cases.js на VDS
# Usage: VDS_HOST=your-vds VDS_USER=user node deploy.ps1
# Or set $env:VDS_HOST and $env:VDS_USER before running

$VDS_HOST = $env:VDS_HOST
$VDS_USER = $env:VDS_USER

if (-not $VDS_HOST -or -not $VDS_USER) {
  Write-Host "Set VDS_HOST and VDS_USER environment variables" -ForegroundColor Red
  Write-Host "Example: $env:VDS_HOST='your-vps'; $env:VDS_USER='root'" -ForegroundColor Yellow
  exit 1
}

Write-Host "Deploying to ${VDS_USER}@${VDS_HOST}..."

# Files to copy
$files = @(
  "scripts\parse-all-cases.js",
  "cron-parse-cases.sh",
  "sudo-cases-parser.service",
  "sud-parser.timer"
)

foreach ($file in $files) {
  if (Test-Path $file) {
    Write-Host "Copying $file..."
    scp "$file" "${VDS_USER}@${VDS_HOST}:/tmp/"
  } else {
    Write-Host "File not found: $file" -ForegroundColor Yellow
  }
}

Write-Host "`nRun these commands on VDS:" -ForegroundColor Green
Write-Host @"

sudo mv /tmp/parse-all-cases.js /opt/sud-app/
sudo mv /tmp/cron-parse-cases.sh /opt/sud-app/
sudo cp /tmp/sudo-cases-parser.service /etc/systemd/system/sud-parser.service
sudo cp /tmp/sud-parser.timer /etc/systemd/system/
sudo sed -i 's/<YOUR_SERVICE_ROLE_KEY>/$env:SUPABASE_SERVICE_ROLE_KEY/g' /etc/systemd/system/sud-parser.service
sudo systemctl daemon-reload
sudo systemctl enable sud-parser.timer
sudo systemctl start sud-parser.timer
sudo systemctl list-timers --all | grep sud-parser

"@