# Copies selected feature files from one template (or root) to another template.
# Usage examples:
#   powershell -ExecutionPolicy Bypass -File .\copy-to-template.ps1 -ToTemplate store-only -FromTemplate full-system -Files js\performance.js,js\restaurant-context.js
#   powershell -ExecutionPolicy Bypass -File .\copy-to-template.ps1 -ToTemplate cafe-modern -FromRoot -Files js\performance.js,sw.js
#   powershell -ExecutionPolicy Bypass -File .\copy-to-template.ps1 -ToTemplate store-only -FromTemplate full-system -Files js\performance.js -DryRun

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ToTemplate,

    [Parameter(Mandatory = $false)]
    [ValidateNotNullOrEmpty()]
    [string]$FromTemplate = "full-system",

    [Parameter(Mandatory = $false)]
    [switch]$FromRoot,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string[]]$Files,

    [Parameter(Mandatory = $false)]
    [switch]$DryRun
)

$ProjectRoot = $PSScriptRoot
$TemplatesRoot = Join-Path $ProjectRoot "templates"

$ToRoot = Join-Path $TemplatesRoot $ToTemplate
if (-not (Test-Path -LiteralPath $ToRoot)) {
    throw "Target template folder not found: $ToRoot"
}

if ($FromRoot) {
    $FromRootPath = $ProjectRoot
} else {
    $FromRootPath = Join-Path $TemplatesRoot $FromTemplate
    if (-not (Test-Path -LiteralPath $FromRootPath)) {
        throw "Source template folder not found: $FromRootPath"
    }
}

Write-Host "Copying files..." -ForegroundColor Cyan
Write-Host "  From: $FromRootPath" -ForegroundColor DarkGray
Write-Host "  To:   $ToRoot" -ForegroundColor DarkGray

$copied = 0
$skipped = 0
$missing = 0

foreach ($rel in $Files) {
    $normalized = $rel -replace "/", "\\"
    $src = Join-Path $FromRootPath $normalized
    $dst = Join-Path $ToRoot $normalized

    if (-not (Test-Path -LiteralPath $src)) {
        Write-Host "MISSING: $rel" -ForegroundColor Yellow
        $missing++
        continue
    }

    $dstDir = Split-Path -Parent $dst
    if (-not (Test-Path -LiteralPath $dstDir)) {
        if ($DryRun) {
            Write-Host "DRYRUN: mkdir $dstDir" -ForegroundColor DarkGray
        } else {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }
    }

    if ($DryRun) {
        Write-Host "DRYRUN: copy $rel" -ForegroundColor DarkGray
        $skipped++
        continue
    }

    Copy-Item -LiteralPath $src -Destination $dst -Force
    Write-Host "COPIED: $rel" -ForegroundColor Green
    $copied++
}

Write-Host "Done. COPIED=$copied, DRYRUN_SKIPPED=$skipped, MISSING=$missing" -ForegroundColor Cyan

if (-not $DryRun) {
    Write-Host "\nImportant: If you copied JS/CSS files, ensure the target template HTML pages reference them via <script src=...> / <link rel=...>." -ForegroundColor Yellow
}
