-- Create intervention configuration tables for SentientIQ v4
-- These tables track intervention configurations, events, and metrics

-- 1. Intervention configurations per tenant
CREATE TABLE IF NOT EXISTS intervention_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  api_key VARCHAR(255) NOT NULL,

  -- Branding
  branding JSONB DEFAULT '{}',

  -- Offers
  offers JSONB DEFAULT '{}',

  -- Channels
  channels JSONB DEFAULT '{}',

  -- Interventions enabled
  interventions JSONB DEFAULT '[]',

  -- Template type
  template VARCHAR(50) DEFAULT 'saas',

  -- Tier
  tier VARCHAR(50) DEFAULT 'starter',

  -- Metadata
  published_version INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Intervention events tracking
CREATE TABLE IF NOT EXISTS intervention_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,

  -- Event details
  type VARCHAR(100) NOT NULL, -- exitIntentModal, confusionHelper, etc.
  trigger_emotion VARCHAR(100), -- abandonment_risk, confusion, etc.
  confidence DECIMAL(3,2),

  -- Interaction tracking
  interaction_occurred BOOLEAN DEFAULT FALSE,
  interaction_type VARCHAR(100), -- clicked, dismissed, converted

  -- Revenue attribution
  revenue_attributed DECIMAL(10,2) DEFAULT 0,
  deal_id VARCHAR(255),

  -- Context
  user_id VARCHAR(255),
  session_id VARCHAR(255),
  page_url TEXT,
  element_selector TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CDN configurations cache
CREATE TABLE IF NOT EXISTS cdn_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  config JSONB NOT NULL,
  cdn_url TEXT,
  invalidation_id VARCHAR(255),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Intervention templates library
CREATE TABLE IF NOT EXISTS intervention_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Template configuration
  trigger_emotion VARCHAR(100) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  tier_required VARCHAR(50) DEFAULT 'starter',

  -- Content templates
  content JSONB NOT NULL,

  -- Categorization
  industry VARCHAR(100),
  use_case VARCHAR(100),

  -- Performance metrics
  avg_interaction_rate DECIMAL(5,2),
  avg_revenue_impact DECIMAL(10,2),

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Aggregated metrics for accountability scorecard
CREATE TABLE IF NOT EXISTS intervention_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,

  -- Time window
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- hourly, daily, weekly, monthly

  -- Core metrics
  total_interventions INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  interaction_rate DECIMAL(5,2),

  -- Revenue metrics
  revenue_influenced DECIMAL(10,2) DEFAULT 0,
  deals_influenced INTEGER DEFAULT 0,
  avg_deal_size DECIMAL(10,2),

  -- By type breakdown
  metrics_by_type JSONB DEFAULT '{}',

  -- By emotion breakdown
  metrics_by_emotion JSONB DEFAULT '{}',

  -- Top performers
  top_performing_type VARCHAR(100),
  worst_performing_type VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. A/B test results for interventions
CREATE TABLE IF NOT EXISTS intervention_ab_tests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  test_id VARCHAR(100) NOT NULL,

  -- Test configuration
  intervention_type VARCHAR(100) NOT NULL,
  variant_a JSONB NOT NULL,
  variant_b JSONB NOT NULL,

  -- Results
  variant_a_shown INTEGER DEFAULT 0,
  variant_a_interactions INTEGER DEFAULT 0,
  variant_b_shown INTEGER DEFAULT 0,
  variant_b_interactions INTEGER DEFAULT 0,

  -- Statistical significance
  confidence_level DECIMAL(5,2),
  winner VARCHAR(1), -- 'A' or 'B'

  -- Status
  status VARCHAR(50) DEFAULT 'running', -- running, completed, paused

  -- Metadata
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Unique constraint
  UNIQUE(tenant_id, test_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_tenant_date
  ON intervention_events(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_type
  ON intervention_events(type);

CREATE INDEX IF NOT EXISTS idx_events_emotion
  ON intervention_events(trigger_emotion);

CREATE INDEX IF NOT EXISTS idx_configs_tenant
  ON intervention_configs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_metrics_tenant_period
  ON intervention_metrics(tenant_id, period_type, period_start DESC);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_intervention_configs_updated_at
  BEFORE UPDATE ON intervention_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intervention_templates_updated_at
  BEFORE UPDATE ON intervention_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default templates
INSERT INTO intervention_templates (template_id, name, trigger_emotion, action_type, content, industry, tier_required)
VALUES
  ('exit_save', 'Exit Intent Save', 'abandonment_risk', 'modal',
   '{"title": "Wait! Don''t Leave Yet", "offer": "20% discount", "cta": "Claim Discount"}',
   'all', 'starter'),

  ('confusion_help', 'Confusion Helper', 'confusion', 'tooltip',
   '{"title": "Need Help?", "message": "We noticed you might be having trouble", "cta": "Get Help"}',
   'all', 'starter'),

  ('price_hover_assist', 'Price Hover Assistant', 'high_consideration', 'assistant',
   '{"title": "Value Breakdown", "points": ["ROI in first year", "Average savings", "Free trial"]}',
   'all', 'starter'),

  ('rage_click_deescalation', 'Rage Click De-escalation', 'frustration', 'notification',
   '{"title": "Having trouble?", "message": "Let us help you right away", "cta": "Get Help Now"}',
   'all', 'starter')
ON CONFLICT (template_id) DO NOTHING;

-- Grant permissions (adjust based on your Supabase setup)
GRANT ALL ON intervention_configs TO authenticated;
GRANT ALL ON intervention_events TO authenticated;
GRANT ALL ON cdn_configs TO authenticated;
GRANT ALL ON intervention_templates TO authenticated;
GRANT ALL ON intervention_metrics TO authenticated;
GRANT ALL ON intervention_ab_tests TO authenticated;

-- Enable RLS (Row Level Security) if needed
ALTER TABLE intervention_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdn_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention_metrics ENABLE ROW LEVEL SECURITY;