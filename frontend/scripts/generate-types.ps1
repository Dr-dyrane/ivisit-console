# Database Types Generation Script (PowerShell)
# Generates TypeScript types from the Supabase schema.

Write-Host "Generating database types from Supabase..." -ForegroundColor Cyan

$outputPath = Join-Path $PSScriptRoot "..\src\types\database.ts"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$generatedTypes = npx supabase gen types typescript --project-id dlwtcmhdzoklveihuhjf --schema public

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($generatedTypes)) {
  throw "Supabase type generation failed."
}

[System.IO.File]::WriteAllText($outputPath, $generatedTypes, $utf8NoBom)

Write-Host "Database types generated successfully." -ForegroundColor Green
Write-Host "File: src\types\database.ts" -ForegroundColor Yellow
Write-Host "Reference: docs\DATABASE_SCHEMA_REFERENCE.md" -ForegroundColor Yellow

$lines = (Get-Content $outputPath | Measure-Object -Line).Lines
Write-Host "Database types file size: $lines lines" -ForegroundColor Cyan

Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host "  import { DatabaseEmergencyRequest } from '@/types';" -ForegroundColor Gray
Write-Host "  import type { Database } from '@/types';" -ForegroundColor Gray
Write-Host ""
Write-Host "Full schema reference available in docs\DATABASE_SCHEMA_REFERENCE.md" -ForegroundColor White
