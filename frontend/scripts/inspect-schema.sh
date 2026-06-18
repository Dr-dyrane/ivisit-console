#!/bin/bash

# Supabase Schema Inspector - Pure REST API version
# No Node.js required - uses curl and jq

echo "🔍 Supabase Schema Inspector"
echo "========================================"
echo ""
read -p "📍 Enter SUPABASE_URL (e.g., https://xxx.supabase.co): " SUPABASE_URL
read -p "🔑 Enter ANON_KEY or SERVICE_ROLE_KEY: " SUPABASE_KEY

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
  echo "❌ Missing credentials"
  exit 1
fi

# Remove trailing slash
SUPABASE_URL="${SUPABASE_URL%/}"

echo ""
echo "⏳ Fetching tables..."
echo ""

# Query information_schema.tables
TABLES=$(curl -s \
  -H "apikey: $SUPABASE_KEY" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  "$SUPABASE_URL/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name" 2>/dev/null)

if echo "$TABLES" | grep -q "error"; then
  echo "❌ Error: Check your URL and API key"
  exit 1
fi

TABLE_NAMES=$(echo "$TABLES" | grep -o '"table_name":"[^"]*"' | cut -d'"' -f4)
TABLE_COUNT=$(echo "$TABLE_NAMES" | wc -w)

echo "✅ Found $TABLE_COUNT tables"
echo ""

# Loop through each table
for TABLE in $TABLE_NAMES; do
  echo "📋 TABLE: $TABLE"
  echo "$(printf '=%.0s' {1..70})"
  
  # Get columns
  COLUMNS=$(curl -s \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    "$SUPABASE_URL/rest/v1/information_schema.columns?table_schema=eq.public&table_name=eq.$TABLE&select=column_name,data_type,is_nullable,column_default&order=ordinal_position.asc" 2>/dev/null)
  
  echo "$COLUMNS" | grep -o '"column_name":"[^"]*","data_type":"[^"]*","is_nullable":"[^"]*"' | while IFS= read -r col; do
    COLNAME=$(echo "$col" | grep -o '"column_name":"[^"]*"' | cut -d'"' -f4)
    DATATYPE=$(echo "$col" | grep -o '"data_type":"[^"]*"' | cut -d'"' -f4)
    NULLABLE=$(echo "$col" | grep -o '"is_nullable":"[^"]*"' | cut -d'"' -f4)
    
    NULLABLE_STR="NOT NULL"
    if [ "$NULLABLE" = "YES" ]; then
      NULLABLE_STR="NULL"
    fi
    
    printf "  %-30s %-20s %s\n" "$COLNAME" "$DATATYPE" "$NULLABLE_STR"
  done
  
  echo ""
done

echo ""
echo "📄 TABLE LIST:"
echo "$TABLE_NAMES" | while read table; do
  echo "  • $table"
done

echo ""
echo "✅ Schema inspection complete!"
