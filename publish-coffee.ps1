# Publishes the coffee-shop static site to Firebase Hosting
# Usage: powershell -ExecutionPolicy Bypass -File publish-coffee.ps1 -SiteId <site> -ProjectId <project>
param(
    [string]$SiteId = "coffee1",
    [string]$ProjectId = "restaurant-system-demo"
)

Write-Host "Publishing coffee-shop to Firebase Hosting site '$SiteId' (project: $ProjectId)..." -ForegroundColor Cyan

$cmd = "firebase deploy --only hosting --site $SiteId --config firebase.coffee.json --project $ProjectId"
Write-Host "Running: $cmd" -ForegroundColor Yellow

try {
    & firebase deploy --only hosting --site $SiteId --config firebase.coffee.json --project $ProjectId
    if ($LASTEXITCODE -ne 0) {
        throw "Firebase deploy exited with code $LASTEXITCODE"
    }
    Write-Host "Deploy completed successfully." -ForegroundColor Green
} catch {
    Write-Host "Deploy failed: $_" -ForegroundColor Red
    exit 1
}
