#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getTables() {
  console.log('📊 Fetching Supabase schema information...\n');

  try {
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_schema, table_name')
      .eq('table_schema', 'public');

    if (tablesError) throw tablesError;

    if (!tables || tables.length === 0) {
      console.log('⚠️  No tables found in public schema');
      return;
    }

    const schemaInfo = {};

    for (const table of tables) {
      const tableName = table.table_name;
      console.log(`\n📋 Table: ${tableName}`);
      console.log('='.repeat(50));

      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (columnsError) {
        console.error(`Error fetching columns for ${tableName}:`, columnsError);
        continue;
      }

      console.log('Columns:');
      columns.forEach((col) => {
        const nullable = col.is_nullable === 'YES' ? '✓ nullable' : '✗ NOT NULL';
        const defaultVal = col.column_default ? ` [DEFAULT: ${col.column_default}]` : '';
        console.log(
          `  • ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`
        );
      });

      try {
        const { data: sampleRow, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!sampleError && sampleRow && sampleRow.length > 0) {
          console.log('\nSample Row:');
          console.log(JSON.stringify(sampleRow[0], null, 2));
        }
      } catch (e) {
      }

      schemaInfo[tableName] = {
        columns: columns.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
          default: c.column_default,
        })),
      };
    }

    const outputPath = path.join(
      path.dirname(new URL(import.meta.url).pathname),
      '../supabase-schema.json'
    );
    fs.writeFileSync(outputPath, JSON.stringify(schemaInfo, null, 2));
    console.log(`\n✅ Schema saved to ${outputPath}`);

    console.log('\n📦 Summary:');
    console.log(`Total tables: ${tables.length}`);
    tables.forEach((t) => {
      console.log(`  • ${t.table_name}`);
    });
  } catch (error) {
    console.error('❌ Error fetching schema:', error.message);
    process.exit(1);
  }
}

getTables();
