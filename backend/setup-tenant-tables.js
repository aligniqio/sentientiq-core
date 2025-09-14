#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file');
  process.exit(1);
}

// Create Supabase client with service key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTenantTables() {
  console.log('🚀 Setting up tenant tables in Supabase...\n');

  try {
    // Read the SQL schema file
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'tenant-schema.sql'), 'utf-8');

    // Split by semicolons to execute statements individually
    const statements = schemaSQL
      .split(/;\s*$|;\s*\n/gm)
      .filter(stmt => stmt.trim().length > 0)
      .map(stmt => stmt.trim() + ';');

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.trim().startsWith('--')) {
        continue;
      }

      // Show progress for CREATE statements
      if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE (?:TABLE|INDEX) (?:IF NOT EXISTS )?(\w+)/i);
        if (match) {
          process.stdout.write(`Creating ${match[1]}... `);
        }
      } else if (statement.includes('INSERT INTO')) {
        const match = statement.match(/INSERT INTO (\w+)/i);
        if (match) {
          process.stdout.write(`Inserting data into ${match[1]}... `);
        }
      } else if (statement.includes('CREATE POLICY')) {
        const match = statement.match(/CREATE POLICY "([^"]+)"/i);
        if (match) {
          process.stdout.write(`Creating policy: ${match[1]}... `);
        }
      } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
        const match = statement.match(/CREATE OR REPLACE FUNCTION (\w+)/i);
        if (match) {
          process.stdout.write(`Creating function ${match[1]}... `);
        }
      }

      try {
        // Execute the SQL statement using Supabase's rpc
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement
        }).single();

        if (error) {
          // Try direct execution as fallback
          const { data, error: directError } = await supabase
            .from('_sql')
            .select()
            .eq('query', statement);

          if (directError) {
            throw directError;
          }
        }

        successCount++;
        if (statement.includes('CREATE') || statement.includes('INSERT')) {
          console.log('✅');
        }
      } catch (error) {
        errorCount++;
        if (statement.includes('CREATE') || statement.includes('INSERT')) {
          console.log('❌');
        }
        console.error(`Error executing statement ${i + 1}:`, error.message);

        // Continue with next statement even if one fails
        if (!error.message.includes('already exists')) {
          console.error('Statement:', statement.substring(0, 100) + '...\n');
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log(`✅ Successfully executed: ${successCount} statements`);
    console.log(`❌ Failed: ${errorCount} statements`);

    // Test the tables by querying them
    console.log('\n🔍 Verifying tables...');

    const tables = [
      'organizations',
      'organization_members',
      'api_keys',
      'subscription_tiers',
      'organization_usage',
      'sage_interactions'
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          console.log(`✅ Table ${table} exists (${count || 0} rows)`);
        } else {
          console.log(`❌ Table ${table} error:`, error.message);
        }
      } catch (error) {
        console.log(`❌ Table ${table} not found`);
      }
    }

    console.log('\n✨ Tenant table setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupTenantTables().catch(console.error);