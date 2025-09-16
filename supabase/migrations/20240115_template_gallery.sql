-- Template Gallery Schema
-- The difference between "nice popup" and "holy shit that converted"

-- Tenant template configurations
CREATE TABLE IF NOT EXISTS tenant_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('starter', 'growth', 'scale', 'enterprise')),
  selected_template_id TEXT NOT NULL,

  -- Branding
  company_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#ffffff',
  accent_color TEXT DEFAULT '#0066ff',
  font_family TEXT DEFAULT 'system-ui',

  -- Custom overrides (growth+ tiers)
  custom_css TEXT,
  custom_messages JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template usage analytics
CREATE TABLE IF NOT EXISTS template_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  session_id TEXT NOT NULL,

  -- Performance metrics
  impressions INTEGER DEFAULT 0,
  interactions INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue_impact DECIMAL(10,2) DEFAULT 0,

  -- A/B testing
  variant TEXT,

  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Template favorites (for quick switching)
CREATE TABLE IF NOT EXISTS template_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(tenant_id, template_id)
);

-- Custom template library (enterprise tier)
CREATE TABLE IF NOT EXISTS custom_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Template definition
  styles JSONB NOT NULL,
  animations JSONB NOT NULL,
  industries JSONB DEFAULT '[]',

  -- Versioning
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template A/B tests
CREATE TABLE IF NOT EXISTS template_experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Test configuration
  control_template_id TEXT NOT NULL,
  variant_template_ids TEXT[] NOT NULL,
  traffic_split JSONB DEFAULT '{"control": 50, "variant": 50}',

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed', 'cancelled')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Results
  winner_template_id TEXT,
  confidence_level DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tenant_template ON template_analytics (tenant_id, template_id);
CREATE INDEX idx_timestamp ON template_analytics (timestamp);
CREATE INDEX idx_tenant_active ON custom_templates (tenant_id, is_active);

-- Row Level Security
ALTER TABLE tenant_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_experiments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY tenant_templates_policy ON tenant_templates
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY template_analytics_policy ON template_analytics
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY template_favorites_policy ON template_favorites
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY custom_templates_policy ON custom_templates
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY template_experiments_policy ON template_experiments
  FOR ALL USING (tenant_id = current_setting('app.tenant_id', true));

-- Functions
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_tenant_templates_timestamp
  BEFORE UPDATE ON tenant_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

CREATE TRIGGER update_custom_templates_timestamp
  BEFORE UPDATE ON custom_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

-- Seed data for demo
INSERT INTO tenant_templates (tenant_id, tier, selected_template_id, company_name, primary_color)
VALUES
  ('demo', 'growth', 'bold_modern', 'Demo Store', '#FF6B00'),
  ('test', 'starter', 'clean_minimal', 'Test Co', '#000000')
ON CONFLICT (tenant_id) DO NOTHING;