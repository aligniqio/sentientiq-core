-- Pattern Learning Tables for SentientIQ
-- Tenant-aware emotional pattern storage for conversion optimization

-- Store emotional patterns that lead to outcomes (conversion/abandonment)
CREATE TABLE IF NOT EXISTS emotional_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  pattern_hash VARCHAR(64) NOT NULL, -- Hash of the emotion sequence for fast lookup
  emotion_sequence TEXT NOT NULL, -- The actual sequence (e.g., "curiosity→interest→price_shock→hesitation")
  outcome_type VARCHAR(50) NOT NULL CHECK (outcome_type IN ('conversion', 'abandonment', 'partial', 'unknown')),
  occurrence_count INTEGER DEFAULT 1,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confidence_score DECIMAL(5,2) DEFAULT 0, -- 0-100 confidence in pattern
  avg_session_duration INTEGER, -- Average time from start to outcome (ms)
  metadata JSONB DEFAULT '{}', -- Store additional context (device, browser, time of day, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Composite index for tenant-specific pattern lookups
  UNIQUE(tenant_id, pattern_hash, outcome_type)
);

-- Track individual session outcomes for learning
CREATE TABLE IF NOT EXISTS session_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  emotion_path TEXT NOT NULL, -- Full emotional journey
  final_outcome VARCHAR(50) NOT NULL CHECK (final_outcome IN ('conversion', 'abandonment', 'partial', 'timeout', 'unknown')),
  conversion_value DECIMAL(10,2), -- If converted, the transaction value
  session_duration INTEGER NOT NULL, -- Total session time in ms
  total_events INTEGER NOT NULL, -- Number of behavioral events
  intervention_triggered BOOLEAN DEFAULT FALSE,
  intervention_type VARCHAR(100),
  intervention_successful BOOLEAN,
  device_type VARCHAR(50),
  browser VARCHAR(50),
  referrer_source VARCHAR(255),
  landing_page VARCHAR(500),
  exit_page VARCHAR(500),
  peak_emotion VARCHAR(100), -- Strongest emotion in session
  peak_confidence DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store intervention effectiveness by pattern
CREATE TABLE IF NOT EXISTS intervention_effectiveness (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  pattern_hash VARCHAR(64) NOT NULL,
  intervention_type VARCHAR(100) NOT NULL,
  total_triggered INTEGER DEFAULT 0,
  successful_conversions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  dismissals INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_triggered = 0 THEN 0
      ELSE (successful_conversions::DECIMAL / total_triggered * 100)
    END
  ) STORED,
  avg_time_to_conversion INTEGER, -- Average ms from intervention to conversion
  revenue_generated DECIMAL(12,2) DEFAULT 0,
  last_triggered TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tenant_id, pattern_hash, intervention_type)
);

-- Emotional Volatility Index tracking
CREATE TABLE IF NOT EXISTS volatility_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('global', 'vertical', 'geography', 'time_of_day', 'day_of_week')),
  metric_value VARCHAR(255), -- e.g., "ecommerce" for vertical, "US-CA" for geography
  evi_score DECIMAL(5,2) NOT NULL, -- 0-100 volatility index
  sample_size INTEGER NOT NULL, -- Number of sessions in calculation
  emotion_variance DECIMAL(10,4),
  dominant_emotions JSONB DEFAULT '[]', -- Array of top emotions
  trend_direction VARCHAR(20) CHECK (trend_direction IN ('increasing', 'decreasing', 'stable')),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  time_window_hours INTEGER DEFAULT 24 -- How many hours of data in this calculation
);

-- Pattern insights for UI display
CREATE TABLE IF NOT EXISTS pattern_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  insight_type VARCHAR(100) NOT NULL, -- 'common_abandonment', 'conversion_driver', 'intervention_opportunity', etc.
  headline TEXT NOT NULL, -- "Your shoppers typically experience sticker shock when viewing premium tiers"
  description TEXT NOT NULL, -- Detailed explanation
  pattern_hash VARCHAR(64),
  frequency INTEGER DEFAULT 0, -- How often this occurs
  impact_score DECIMAL(5,2), -- 0-100 business impact
  recommendation TEXT, -- Actionable advice
  supporting_data JSONB DEFAULT '{}', -- Charts data, percentages, etc.
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'monitoring')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Aggregated pattern statistics by tenant
CREATE TABLE IF NOT EXISTS tenant_pattern_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL UNIQUE,
  total_patterns_learned INTEGER DEFAULT 0,
  conversion_patterns INTEGER DEFAULT 0,
  abandonment_patterns INTEGER DEFAULT 0,
  avg_conversion_confidence DECIMAL(5,2),
  avg_abandonment_confidence DECIMAL(5,2),
  most_common_conversion_path TEXT,
  most_common_abandonment_path TEXT,
  total_sessions_analyzed INTEGER DEFAULT 0,
  overall_conversion_rate DECIMAL(5,2),
  patterns_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Real-time pattern matching cache (for fast lookups during live sessions)
CREATE TABLE IF NOT EXISTS pattern_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  pattern_prefix VARCHAR(500) NOT NULL, -- First N emotions of a pattern
  likely_outcome VARCHAR(50),
  confidence DECIMAL(5,2),
  recommended_intervention VARCHAR(100),
  cache_ttl_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(tenant_id, pattern_prefix)
);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_pattern_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM pattern_cache
  WHERE created_at < NOW() - INTERVAL '1 hour' * cache_ttl_minutes / 60;
END;
$$ LANGUAGE plpgsql;

-- Function to update pattern statistics
CREATE OR REPLACE FUNCTION update_pattern_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update emotional_patterns occurrence count
  UPDATE emotional_patterns
  SET
    occurrence_count = occurrence_count + 1,
    last_seen = NOW(),
    confidence_score = LEAST(100, confidence_score + 2) -- Increase confidence with each occurrence
  WHERE
    tenant_id = NEW.tenant_id
    AND pattern_hash = MD5(NEW.emotion_path)
    AND outcome_type = NEW.final_outcome;

  -- If pattern doesn't exist, it will be inserted by the application

  -- Update tenant statistics
  INSERT INTO tenant_pattern_stats (tenant_id, total_sessions_analyzed)
  VALUES (NEW.tenant_id, 1)
  ON CONFLICT (tenant_id)
  DO UPDATE SET
    total_sessions_analyzed = tenant_pattern_stats.total_sessions_analyzed + 1,
    patterns_last_updated = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats on new session outcomes
CREATE TRIGGER update_stats_on_outcome
  AFTER INSERT ON session_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION update_pattern_stats();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patterns_tenant_outcome ON emotional_patterns (tenant_id, outcome_type);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON emotional_patterns (tenant_id, confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_sequence ON emotional_patterns USING gin(to_tsvector('english', emotion_sequence));

CREATE INDEX IF NOT EXISTS idx_outcomes_tenant_session ON session_outcomes (tenant_id, session_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_tenant_date ON session_outcomes (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_intervention ON session_outcomes (tenant_id, intervention_type, intervention_successful);
CREATE INDEX IF NOT EXISTS idx_outcomes_emotions ON session_outcomes USING gin(to_tsvector('english', emotion_path));

CREATE INDEX IF NOT EXISTS idx_effectiveness_tenant_success ON intervention_effectiveness (tenant_id, success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_effectiveness_pattern ON intervention_effectiveness (pattern_hash);

CREATE INDEX IF NOT EXISTS idx_volatility_tenant_type ON volatility_metrics (tenant_id, metric_type, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_volatility_score ON volatility_metrics (tenant_id, evi_score DESC);

CREATE INDEX IF NOT EXISTS idx_insights_tenant_active ON pattern_insights (tenant_id, status, impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_insights_pattern ON pattern_insights (pattern_hash);
CREATE INDEX IF NOT EXISTS idx_insights_headline ON pattern_insights USING gin(to_tsvector('english', headline));

CREATE INDEX IF NOT EXISTS idx_tenant_stats ON tenant_pattern_stats (tenant_id);

CREATE INDEX IF NOT EXISTS idx_cache_tenant_prefix ON pattern_cache (tenant_id, pattern_prefix);
CREATE INDEX IF NOT EXISTS idx_cache_expiry ON pattern_cache (created_at);

-- Comments for documentation
COMMENT ON TABLE emotional_patterns IS 'Stores learned emotional sequences that lead to specific outcomes, tenant-aware for CRO';
COMMENT ON TABLE session_outcomes IS 'Individual session results used for pattern learning and analysis';
COMMENT ON TABLE intervention_effectiveness IS 'Tracks which interventions work best for which emotional patterns';
COMMENT ON TABLE volatility_metrics IS 'Emotional Volatility Index (EVI) - the Bloomberg Terminal metrics';
COMMENT ON TABLE pattern_insights IS 'Human-readable insights for tenant dashboards showing pattern discoveries';
COMMENT ON TABLE tenant_pattern_stats IS 'Aggregated statistics per tenant for quick dashboard access';
COMMENT ON TABLE pattern_cache IS 'Fast lookup cache for real-time pattern matching during live sessions';