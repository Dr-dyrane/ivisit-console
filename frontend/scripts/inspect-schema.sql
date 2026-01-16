-- Supabase Schema Inspector SQL
-- Run this in Supabase SQL Editor (https://app.supabase.com/project/[your-project]/sql)

-- List all tables with row counts
SELECT 
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count,
  pg_size_pretty(pg_total_relation_size(quote_ident(t.table_schema) || '.' || quote_ident(t.table_name))) as table_size
FROM information_schema.tables t
WHERE t.table_schema = 'public'
ORDER BY t.table_name;

-- ============================================================
-- Get detailed schema for all tables
-- ============================================================

SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' 
  AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================================
-- Get row counts for all tables
-- ============================================================

SELECT 
  pg_stat_user_tables.schemaname,
  pg_stat_user_tables.relname as table_name,
  pg_stat_user_tables.n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(pg_stat_user_tables.schemaname || '.' || pg_stat_user_tables.relname)) as size
FROM pg_stat_user_tables
WHERE pg_stat_user_tables.schemaname = 'public'
ORDER BY pg_stat_user_tables.n_live_tup DESC;

-- ============================================================
-- Get indexes for all tables
-- ============================================================

SELECT 
  t.tablename,
  i.indexname,
  a.attname as column_name,
  ix.indisprimary,
  ix.indisunique
FROM pg_indexes i
JOIN pg_class c ON c.relname = i.indexname
JOIN pg_index ix ON ix.indexrelid = c.oid
JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
JOIN pg_tables t ON t.tablename = i.tablename
WHERE i.schemaname = 'public'
ORDER BY t.tablename, i.indexname;

-- ============================================================
-- Get foreign key relationships
-- ============================================================

SELECT 
  kcu1.table_name as from_table,
  kcu1.column_name as from_column,
  kcu2.table_name as to_table,
  kcu2.column_name as to_column,
  rc.constraint_name
FROM information_schema.referential_constraints rc
JOIN information_schema.key_column_usage kcu1 ON rc.constraint_name = kcu1.constraint_name
JOIN information_schema.key_column_usage kcu2 ON rc.unique_constraint_name = kcu2.constraint_name
WHERE kcu1.table_schema = 'public'
ORDER BY from_table, from_column;

-- ============================================================
-- Get table row counts (simpler version)
-- ============================================================

SELECT 
  schemaname,
  relname as table_name,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
