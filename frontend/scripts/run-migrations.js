#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- REACT_APP_SUPABASE_URL');
  console.error('- REACT_APP_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filePath, fileName) {
  try {
    console.log(`Running migration: ${fileName}`);
    
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error(`Error running ${fileName}:`, error);
      return false;
    }
    
    console.log(`✅ Successfully ran: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`Error reading or running ${fileName}:`, error);
    return false;
  }
}

async function runAllMigrations() {
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  
  // Get all migration files, sort by filename
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  console.log(`Found ${migrationFiles.length} migration files`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const success = await runMigration(filePath, file);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
      console.log(`⚠️  Migration failed: ${file}`);
    }
  }
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Total: ${migrationFiles.length}`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

// Run migrations
runAllMigrations().catch(console.error);
