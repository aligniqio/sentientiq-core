-- Emotional Events Table
-- This is where we store every emotion detected across all websites

CREATE TABLE IF NOT EXISTS emotional_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  emotion TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  intensity INTEGER,
  page_url TEXT,
  element_target TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_emotional_events_tenant_id ON emotional_events (tenant_id);
CREATE INDEX IF NOT EXISTS idx_emotional_events_session_id ON emotional_events (session_id);
CREATE INDEX IF NOT EXISTS idx_emotional_events_emotion ON emotional_events (emotion);
CREATE INDEX IF NOT EXISTS idx_emotional_events_timestamp ON emotional_events (timestamp);

-- Emotional Patterns Table
-- Aggregated patterns per tenant
CREATE TABLE IF NOT EXISTS emotional_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  emotion TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  conversion_impact DECIMAL,
  revenue_impact DECIMAL,
  
  UNIQUE(tenant_id, emotion)
);

-- Emotional Sessions Table
-- Track session-level metrics
CREATE TABLE IF NOT EXISTS emotional_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_event_at TIMESTAMPTZ DEFAULT NOW(),
  dominant_emotion TEXT,
  event_count INTEGER DEFAULT 0,
  converted BOOLEAN DEFAULT FALSE,
  revenue DECIMAL
);

-- Enable Row Level Security
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - tenants can only see their own data
CREATE POLICY "Tenants can view own emotional events" ON emotional_events
  FOR SELECT USING (tenant_id = auth.uid()::text);

CREATE POLICY "Tenants can view own emotional patterns" ON emotional_patterns
  FOR SELECT USING (tenant_id = auth.uid()::text);

CREATE POLICY "Tenants can view own emotional sessions" ON emotional_sessions
  FOR SELECT USING (tenant_id = auth.uid()::text);

-- Service role can do everything
CREATE POLICY "Service role full access events" ON emotional_events
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access patterns" ON emotional_patterns
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access sessions" ON emotional_sessions
  FOR ALL USING (auth.role() = 'service_role');