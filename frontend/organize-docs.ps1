# Documentation Organization Script

$docsPath = "docs"

# User Management files
$userMgmt = @(
    "USER_MANAGEMENT_RBAC.md",
    "USERNAME_AUTO_GENERATION.md",
    "USERNAME_SAFETY_GUARANTEE.md",
    "USERNAME_MIGRATION_FIXED.md"
)

# Provider Management files
$providerMgmt = @(
    "DOCTOR_MANAGEMENT_PLAN.md",
    "DOCTOR_MANAGEMENT_AUDIT.md",
    "DOCTOR_DATA_FLOW_ARCHITECTURE.md",
    "DOCTOR_FLOW_CROSSCHECK.md",
    "CHECKPOINT_PROVIDER_MANAGEMENT.md",
    "PRODUCTION_SCHEMA_MISMATCH_ANALYSIS.md",
    "MIGRATION_COMPLETE.md",
    "MIGRATION_COMPLETION_CHECKLIST.md",
    "SCHEMA_CACHE_AND_MISSING_COLUMNS.md",
    "READY_TO_DEPLOY_MIGRATIONS.md"
)

# Modal Fixes files
$modalFixes = @(
    "MODAL_SELECT_FIXES.md",
    "CRITICAL_MODAL_SELECT_AUDIT.md"
)

# UI/UX files
$uiux = @(
    "MASTER_BLUEPRINT.md",
    "LAYOUT_APPLE_AUDIT.md",
    "LAYOUT_FIXES_APPLIED.md",
    "ENHANCED_NAVIGATION.md",
    "NAVIGATION_DESIGN.md",
    "MANAGEMENT_PAGE_STANDARDS.md",
    "DATA_VIEW_SYSTEM.md",
    "CONTEXT_PANEL_SYSTEM.md",
    "PHASE_2_FAB.md",
    "CONSOLE_INTEGRATION.md",
    "SEARCH_SETUP.md",
    "SEARCH_TRENDING_SOLUTION.md",
    "MAP_SYSTEM_GUIDE.md"
)

# Database files
$database = @(
    "DATABASE_SCHEMA.md",
    "AUDIT_REPORT.md"
)

Write-Host "Organizing documentation files..." -ForegroundColor Cyan

# User Management
foreach ($file in $userMgmt) {
    $source = Join-Path $docsPath $file
    if (Test-Path $source) {
        Move-Item -Path $source -Destination (Join-Path $docsPath "user-management") -Force
        Write-Host "Moved: $file" -ForegroundColor Green
    }
}

# Provider Management
foreach ($file in $providerMgmt) {
    $source = Join-Path $docsPath $file
    if (Test-Path $source) {
        Move-Item -Path $source -Destination (Join-Path $docsPath "provider-management") -Force
        Write-Host "Moved: $file" -ForegroundColor Green
    }
}

# Modal Fixes
foreach ($file in $modalFixes) {
    $source = Join-Path $docsPath $file
    if (Test-Path $source) {
        Move-Item -Path $source -Destination (Join-Path $docsPath "modal-fixes") -Force
        Write-Host "Moved: $file" -ForegroundColor Green
    }
}

# UI/UX
foreach ($file in $uiux) {
    $source = Join-Path $docsPath $file
    if (Test-Path $source) {
        Move-Item -Path $source -Destination (Join-Path $docsPath "ui-ux") -Force
        Write-Host "Moved: $file" -ForegroundColor Green
    }
}

# Database
foreach ($file in $database) {
    $source = Join-Path $docsPath $file
    if (Test-Path $source) {
        Move-Item -Path $source -Destination (Join-Path $docsPath "database") -Force
        Write-Host "Moved: $file" -ForegroundColor Green
    }
}

Write-Host "`nDone! Documentation organized." -ForegroundColor Green
