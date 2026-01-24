# Database Types Generation Script (PowerShell)
# Generates TypeScript types from Supabase database schema

Write-Host "🔄 Generating database types from Supabase..." -ForegroundColor Cyan

# Generate types from remote Supabase project
$npx supabase gen types typescript --project-id dlwtcmhdzoklveihuhjf --schema public | Out-File -Encoding utf8 src\types\database.ts

Write-Host "✅ Database types generated successfully!" -ForegroundColor Green
Write-Host "📄 File: src\types\database.ts" -ForegroundColor Yellow
Write-Host "📖 Reference: docs\DATABASE_SCHEMA_REFERENCE.md" -ForegroundColor Yellow

# Show file size
$lines = (Get-Content "src\types\database.ts" | Measure-Object -Line).Lines
Write-Host "📊 Database types file size: $lines lines" -ForegroundColor Cyan

Write-Host ""
Write-Host "🎯 Usage:" -ForegroundColor White
Write-Host "   import { DatabaseEmergencyRequest } from '@/types';" -ForegroundColor Gray
Write-Host "   import type { Database } from '@/types';" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Full schema reference available in docs\DATABASE_SCHEMA_REFERENCE.md" -ForegroundColor White
