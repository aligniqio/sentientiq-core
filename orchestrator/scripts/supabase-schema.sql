-- SentientIQ Alpha Deployment Schema
-- Execute this SQL in your Supabase SQL Editor for alpha deployment

-- Emotional events table (replaces S3/Athena for alpha)
CREATE TABLE IF NOT EXISTS emotional_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  vertical TEXT NOT NULL,
  geography TEXT NOT NULL,
  emotion TEXT NOT NULL,
  confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  intensity DECIMAL(5,2) NOT NULL CHECK (intensity >= 0 AND intensity <= 100),
  dollar_value DECIMAL(10,2) DEFAULT 0,
  intervention_taken BOOLEAN DEFAULT false,
  outcome TEXT,
  page_url TEXT,
  element_target TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indices for common queries
CREATE INDEX IF NOT EXISTS idx_emotional_events_timestamp 
ON emotional_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_emotional_events_company 
ON emotional_events(company_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_emotional_events_emotion 
ON emotional_events(emotion, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_emotional_events_user_session 
ON emotional_events(user_id, session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_emotional_events_intervention 
ON emotional_events(intervention_taken, timestamp DESC) 
WHERE intervention_taken = true;

-- GIN index for fast metadata queries
CREATE INDEX IF NOT EXISTS idx_emotional_events_metadata 
ON emotional_events USING GIN (metadata);

-- Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their company's data
CREATE POLICY IF NOT EXISTS "Company isolation" ON emotional_events
FOR ALL USING (
  company_id = current_setting('app.current_company_id', true)
);

-- Helper views for common analytics queries
CREATE OR REPLACE VIEW emotion_hourly_summary AS
SELECT 
  date_trunc('hour', timestamp) as hour,
  company_id,
  emotion,
  COUNT(*) as event_count,
  AVG(confidence) as avg_confidence,
  AVG(intensity) as avg_intensity,
  SUM(dollar_value) as total_value,
  COUNT(CASE WHEN intervention_taken THEN 1 END) as interventions
FROM emotional_events
GROUP BY date_trunc('hour', timestamp), company_id, emotion;

CREATE OR REPLACE VIEW company_emotion_stats AS
SELECT 
  company_id,
  COUNT(*) as total_events,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(confidence) as avg_confidence,
  AVG(intensity) as avg_intensity,
  SUM(dollar_value) as total_value,
  COUNT(CASE WHEN intervention_taken THEN 1 END) as total_interventions,
  ROUND(100.0 * COUNT(CASE WHEN intervention_taken THEN 1 END) / COUNT(*), 2) as intervention_rate,
  MIN(timestamp) as first_event,
  MAX(timestamp) as last_event
FROM emotional_events
GROUP BY company_id;

-- Function to get emotion distribution for a company
CREATE OR REPLACE FUNCTION get_emotion_distribution(
  target_company_id TEXT,
  hours_back INTEGER DEFAULT 24
)
RETURNS TABLE(
  emotion TEXT,
  count BIGINT,
  percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH emotion_counts AS (
    SELECT 
      ee.emotion,
      COUNT(*) as count
    FROM emotional_events ee
    WHERE ee.company_id = target_company_id
    AND ee.timestamp > NOW() - (hours_back * INTERVAL '1 hour')
    GROUP BY ee.emotion
  ),
  total_count AS (
    SELECT SUM(count) as total FROM emotion_counts
  )
  SELECT 
    ec.emotion,
    ec.count,
    ROUND(100.0 * ec.count / tc.total, 2) as percentage
  FROM emotion_counts ec
  CROSS JOIN total_count tc
  ORDER BY ec.count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get intervention effectiveness
CREATE OR REPLACE FUNCTION get_intervention_effectiveness(
  target_company_id TEXT,
  hours_back INTEGER DEFAULT 168 -- 1 week
)
RETURNS TABLE(
  emotion TEXT,
  total_events BIGINT,
  interventions BIGINT,
  success_rate DECIMAL,
  avg_value_before DECIMAL,
  avg_value_after DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ee.emotion,
    COUNT(*) as total_events,
    COUNT(CASE WHEN ee.intervention_taken THEN 1 END) as interventions,
    ROUND(100.0 * COUNT(CASE WHEN ee.intervention_taken THEN 1 END) / COUNT(*), 2) as success_rate,
    ROUND(AVG(CASE WHEN NOT ee.intervention_taken THEN ee.dollar_value END), 2) as avg_value_before,
    ROUND(AVG(CASE WHEN ee.intervention_taken THEN ee.dollar_value END), 2) as avg_value_after
  FROM emotional_events ee
  WHERE ee.company_id = target_company_id
  AND ee.timestamp > NOW() - (hours_back * INTERVAL '1 hour')
  GROUP BY ee.emotion
  HAVING COUNT(*) >= 10  -- Only show emotions with significant data
  ORDER BY success_rate DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notification log for Slack stubs
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_id TEXT NOT NULL,
  notification_type TEXT NOT NULL, -- 'sms', 'call', 'email'
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  channel TEXT DEFAULT 'slack', -- 'slack', 'twilio', 'email'
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'pending'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_notification_log_timestamp 
ON notification_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_notification_log_company 
ON notification_log(company_id, timestamp DESC);

-- Grant necessary permissions
-- (You may need to adjust these based on your Supabase setup)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON emotional_events TO anon, authenticated;
GRANT SELECT ON emotion_hourly_summary TO anon, authenticated;
GRANT SELECT ON company_emotion_stats TO anon, authenticated;
GRANT SELECT ON notification_log TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_emotion_distribution TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_intervention_effectiveness TO anon, authenticated;

-- Insert some sample data for testing (optional)
INSERT INTO emotional_events (
  user_id, 
  company_id, 
  session_id, 
  vertical, 
  geography, 
  emotion, 
  confidence, 
  intensity,
  dollar_value,
  page_url,
  user_agent,
  metadata
) VALUES 
(
  'user_123', 
  'company_alpha', 
  'session_456', 
  'saas', 
  'us-east', 
  'excitement', 
  85.5, 
  72.3,
  150.00,
  'https://example.com/pricing',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  '{"device_type": "desktop", "platform": "web"}'::jsonb
),
(
  'user_456', 
  'company_alpha', 
  'session_789', 
  'saas', 
  'us-east', 
  'frustration', 
  91.2, 
  88.7,
  0.00,
  'https://example.com/checkout',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
  '{"device_type": "mobile", "platform": "web"}'::jsonb
);

-- Success message
SELECT 'SentientIQ alpha schema created successfully! 🚀' as status;