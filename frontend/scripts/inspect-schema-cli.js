#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function inspectSchema() {
  console.log('\n🔍 Supabase Schema Inspector');
  console.log('='.repeat(60));

  const supabaseUrl = await question('\n📍 Enter SUPABASE_URL (e.g., https://xxx.supabase.co): ');
  const supabaseKey = await question(
    '🔑 Enter SERVICE_ROLE_KEY (or ANON_KEY): '
  );

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials');
    rl.close();
    process.exit(1);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('\n⏳ Fetching tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .eq('table_schema', 'public');

    if (tablesError) throw tablesError;

    if (!tables || tables.length === 0) {
      console.log('⚠️  No tables found in public schema');
      rl.close();
      return;
    }

    console.log(`\n✅ Found ${tables.length} tables\n`);

    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n📋 TABLE: ${tableName}`);
      console.log('-'.repeat(70));

      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (columnsError) {
        console.error(`❌ Error fetching columns:`, columnsError);
        continue;
      }

      columns.forEach((col, idx) => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT: ${col.column_default}` : '';
        console.log(
          `  ${(idx + 1).toString().padEnd(3)} | ${col.column_name.padEnd(30)} | ${col.data_type.padEnd(20)} | ${nullable}${defaultVal}`
        );
      });

      const { count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      console.log(`\n  📊 Row count: ${count}`);
    }

    console.log('\n\n✅ Schema inspection complete!');
    console.log('\n📄 TABLE SUMMARY:');
    tables.forEach((t) => console.log(`  • ${t.table_name}`));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('Invalid API key')) {
      console.error('   → Check that your API key is correct');
    }
    if (error.message.includes('Invalid URL')) {
      console.error('   → Check that your Supabase URL is correct');
    }
  } finally {
    rl.close();
  }
}

inspectSchema();
