#!/usr/bin/env node

/**
 * Setup Supabase tables for intervention tracking
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTables() {
  console.log('🚀 Setting up Supabase tables for intervention tracking...\n');

  try {
    // Create intervention_configs table
    console.log('📊 Creating intervention_configs table...');
    const { error: configError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS intervention_configs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id VARCHAR(255) UNIQUE NOT NULL,
          api_key VARCHAR(255) NOT NULL,
          branding JSONB DEFAULT '{}',
          offers JSONB DEFAULT '{}',
          channels JSONB DEFAULT '{}',
          interventions JSONB DEFAULT '[]',
          template VARCHAR(50) DEFAULT 'saas',
          tier VARCHAR(50) DEFAULT 'starter',
          published_version INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }).single();

    if (configError && !configError.message.includes('already exists')) {
      console.error('Error creating intervention_configs:', configError);
    } else {
      console.log('✅ intervention_configs table ready');
    }

    // Create intervention_events table
    console.log('📊 Creating intervention_events table...');
    const { error: eventsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS intervention_events (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          type VARCHAR(100) NOT NULL,
          trigger_emotion VARCHAR(100),
          confidence DECIMAL(3,2),
          interaction_occurred BOOLEAN DEFAULT FALSE,
          interaction_type VARCHAR(100),
          revenue_attributed DECIMAL(10,2) DEFAULT 0,
          deal_id VARCHAR(255),
          user_id VARCHAR(255),
          session_id VARCHAR(255),
          page_url TEXT,
          element_selector TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_events_tenant_date
          ON intervention_events(tenant_id, created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_events_type
          ON intervention_events(type);
      `
    }).single();

    if (eventsError && !eventsError.message.includes('already exists')) {
      console.error('Error creating intervention_events:', eventsError);
    } else {
      console.log('✅ intervention_events table ready');
    }

    // Create cdn_configs table
    console.log('📊 Creating cdn_configs table...');
    const { error: cdnError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS cdn_configs (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id VARCHAR(255) UNIQUE NOT NULL,
          config JSONB NOT NULL,
          cdn_url TEXT,
          invalidation_id VARCHAR(255),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }).single();

    if (cdnError && !cdnError.message.includes('already exists')) {
      console.error('Error creating cdn_configs:', cdnError);
    } else {
      console.log('✅ cdn_configs table ready');
    }

    // Create intervention_templates table
    console.log('📊 Creating intervention_templates table...');
    const { error: templatesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS intervention_templates (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          template_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          trigger_emotion VARCHAR(100) NOT NULL,
          action_type VARCHAR(100) NOT NULL,
          tier_required VARCHAR(50) DEFAULT 'starter',
          content JSONB NOT NULL,
          industry VARCHAR(100),
          use_case VARCHAR(100),
          avg_interaction_rate DECIMAL(5,2),
          avg_revenue_impact DECIMAL(10,2),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }).single();

    if (templatesError && !templatesError.message.includes('already exists')) {
      console.error('Error creating intervention_templates:', templatesError);
    } else {
      console.log('✅ intervention_templates table ready');
    }

    // Insert default templates
    console.log('🎨 Inserting default intervention templates...');
    const templates = [
      {
        template_id: 'exit_save',
        name: 'Exit Intent Save',
        trigger_emotion: 'abandonment_risk',
        action_type: 'modal',
        content: {
          title: "Wait! Don't Leave Yet",
          offer: '20% discount',
          cta: 'Claim Discount'
        },
        industry: 'all',
        tier_required: 'starter'
      },
      {
        template_id: 'confusion_help',
        name: 'Confusion Helper',
        trigger_emotion: 'confusion',
        action_type: 'tooltip',
        content: {
          title: 'Need Help?',
          message: 'We noticed you might be having trouble',
          cta: 'Get Help'
        },
        industry: 'all',
        tier_required: 'starter'
      },
      {
        template_id: 'price_hover_assist',
        name: 'Price Hover Assistant',
        trigger_emotion: 'high_consideration',
        action_type: 'assistant',
        content: {
          title: 'Value Breakdown',
          points: ['ROI in first year', 'Average savings', 'Free trial']
        },
        industry: 'all',
        tier_required: 'starter'
      },
      {
        template_id: 'rage_click_deescalation',
        name: 'Rage Click De-escalation',
        trigger_emotion: 'frustration',
        action_type: 'notification',
        content: {
          title: 'Having trouble?',
          message: 'Let us help you right away',
          cta: 'Get Help Now'
        },
        industry: 'all',
        tier_required: 'starter'
      }
    ];

    for (const template of templates) {
      const { error } = await supabase
        .from('intervention_templates')
        .upsert(template, { onConflict: 'template_id' });

      if (error) {
        console.error(`Error inserting template ${template.template_id}:`, error);
      }
    }
    console.log('✅ Default templates inserted');

    // Create intervention_metrics table
    console.log('📊 Creating intervention_metrics table...');
    const { error: metricsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS intervention_metrics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          tenant_id VARCHAR(255) NOT NULL,
          period_start TIMESTAMP WITH TIME ZONE NOT NULL,
          period_end TIMESTAMP WITH TIME ZONE NOT NULL,
          period_type VARCHAR(20) NOT NULL,
          total_interventions INTEGER DEFAULT 0,
          total_interactions INTEGER DEFAULT 0,
          interaction_rate DECIMAL(5,2),
          revenue_influenced DECIMAL(10,2) DEFAULT 0,
          deals_influenced INTEGER DEFAULT 0,
          avg_deal_size DECIMAL(10,2),
          metrics_by_type JSONB DEFAULT '{}',
          metrics_by_emotion JSONB DEFAULT '{}',
          top_performing_type VARCHAR(100),
          worst_performing_type VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_metrics_tenant_period
          ON intervention_metrics(tenant_id, period_type, period_start DESC);
      `
    }).single();

    if (metricsError && !metricsError.message.includes('already exists')) {
      console.error('Error creating intervention_metrics:', metricsError);
    } else {
      console.log('✅ intervention_metrics table ready');
    }

    console.log('\n🎉 All tables created successfully!');
    console.log('📊 You can now start tracking interventions and metrics.');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setupTables().then(() => {
  console.log('\n✨ Setup complete!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});