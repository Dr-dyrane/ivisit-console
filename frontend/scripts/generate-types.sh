#!/bin/bash

# Database Types Generation Script
# Generates TypeScript types from Supabase database schema

echo "🔄 Generating database types from Supabase..."

# Generate types from remote Supabase project
npx supabase gen types typescript \
  --project-id dlwtcmhdzoklveihuhjf \
  --schema public \
  > src/types/database.ts

echo "✅ Database types generated successfully!"
echo "📄 File: src/types/database.ts"
echo "📖 Reference: docs/DATABASE_SCHEMA_REFERENCE.md"

# Show file size
echo "📊 Database types file size:"
wc -l src/types/database.ts

echo ""
echo "🎯 Usage:"
echo "   import { DatabaseEmergencyRequest } from '@/types';"
echo "   import type { Database } from '@/types';"
echo ""
echo "📚 Full schema reference available in docs/DATABASE_SCHEMA_REFERENCE.md"
