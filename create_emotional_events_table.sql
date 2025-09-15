-- Create emotional_events table for SentientIQ v4
CREATE TABLE IF NOT EXISTS emotional_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    tenant_id TEXT, -- Legacy field for backwards compatibility
    session_id TEXT NOT NULL,
    emotion TEXT NOT NULL,
    confidence NUMERIC NOT NULL,
    intensity NUMERIC,
    page_url TEXT,
    element_target TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emotional_events_session_id ON emotional_events (session_id);
CREATE INDEX IF NOT EXISTS idx_emotional_events_organization_id ON emotional_events (organization_id);
CREATE INDEX IF NOT EXISTS idx_emotional_events_tenant_id ON emotional_events (tenant_id); -- Keep for backwards compatibility
CREATE INDEX IF NOT EXISTS idx_emotional_events_created_at ON emotional_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_events_emotion ON emotional_events (emotion);

-- Enable Row Level Security
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (full access)
CREATE POLICY "Service role can manage all events" ON emotional_events
    FOR ALL
    USING (TRUE);  -- Service role has full access when using service key

-- Create policy for authenticated users to read all events (for now)
-- Can be refined later when tenant system is fully implemented
CREATE POLICY "Authenticated users can read events" ON emotional_events
    FOR SELECT
    USING (TRUE);  -- Allow all authenticated users to read events