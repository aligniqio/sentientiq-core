-- Sage Analysis Storage with PGVector
-- Clean slate for Supabase with vector embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop everything and start fresh
DROP TABLE IF EXISTS sage_analyses CASCADE;
DROP TABLE IF EXISTS message_patterns CASCADE;
DROP TABLE IF EXISTS bullshit_signatures CASCADE;

-- Main analyses table with embeddings
CREATE TABLE sage_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Message details
  message_content TEXT NOT NULL,
  message_hash VARCHAR(64), -- SHA256 to detect duplicates
  sender VARCHAR(255),
  sender_company VARCHAR(255),
  sender_title VARCHAR(255),
  platform VARCHAR(50) DEFAULT 'linkedin',
  
  -- Embeddings for similarity search
  message_embedding vector(1536), -- OpenAI ada-002 embeddings
  
  -- Sage's analysis
  bullshit_score DECIMAL(3,2) CHECK (bullshit_score >= 0 AND bullshit_score <= 1),
  recommendation VARCHAR(20) CHECK (recommendation IN ('DELETE', 'RESPOND', 'INVESTIGATE')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Detailed analysis (JSONB for flexibility)
  analysis JSONB NOT NULL,
  /* Expected structure:
  {
    "manipulation_tactics": ["ego_flattery", "false_urgency", "artificial_scarcity"],
    "emotional_patterns": ["manufactured_enthusiasm", "fake_familiarity"],
    "hidden_agenda": "Sell overpriced conference ticket",
    "authentic_elements": ["Actual person", "Real company"],
    "reasoning": "Classic vanity award pattern detected...",
    "suggested_response": "If you must respond...",
    "similar_messages": [array of IDs],
    "sage_version": "1.0.0"
  }
  */
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255), -- Clerk user ID if applicable
  ip_address INET,
  
  -- Performance indexes
  CONSTRAINT unique_message_hash UNIQUE(message_hash)
);

-- Indexes for performance
CREATE INDEX idx_sage_created_at ON sage_analyses(created_at DESC);
CREATE INDEX idx_sage_bullshit_score ON sage_analyses(bullshit_score DESC);
CREATE INDEX idx_sage_platform ON sage_analyses(platform);
CREATE INDEX idx_sage_recommendation ON sage_analyses(recommendation);
CREATE INDEX idx_sage_sender ON sage_analyses(sender);
CREATE INDEX idx_sage_user_id ON sage_analyses(user_id);

-- Vector similarity index (HNSW for fast similarity search)
CREATE INDEX idx_sage_embedding ON sage_analyses 
USING hnsw (message_embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Pattern library - known bullshit patterns
CREATE TABLE message_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_name VARCHAR(100) NOT NULL,
  pattern_type VARCHAR(50) NOT NULL, -- 'vanity_award', 'fake_connection', 'outsourcing_pitch', etc.
  
  -- Representative embedding (centroid of cluster)
  pattern_embedding vector(1536),
  
  -- Pattern details
  example_count INTEGER DEFAULT 0,
  average_bullshit_score DECIMAL(3,2),
  common_tactics JSONB, -- Array of most common tactics
  
  -- Signature phrases that identify this pattern
  signature_phrases TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pattern_embedding ON message_patterns 
USING hnsw (pattern_embedding vector_cosine_ops);

-- Known bullshit signatures (specific senders/companies)
CREATE TABLE bullshit_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Entity details
  entity_type VARCHAR(20) CHECK (entity_type IN ('person', 'company', 'domain')),
  entity_name VARCHAR(255) NOT NULL,
  entity_identifier VARCHAR(255), -- email, domain, linkedin URL
  
  -- Bullshit metrics
  total_messages INTEGER DEFAULT 0,
  average_bullshit_score DECIMAL(3,2),
  highest_bullshit_score DECIMAL(3,2),
  
  -- Pattern details
  common_patterns TEXT[],
  known_tactics JSONB,
  
  -- Metadata
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  flagged BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  CONSTRAINT unique_entity UNIQUE(entity_type, entity_identifier)
);

CREATE INDEX idx_signature_entity ON bullshit_signatures(entity_type, entity_name);
CREATE INDEX idx_signature_score ON bullshit_signatures(average_bullshit_score DESC);

-- Function to find similar messages
CREATE OR REPLACE FUNCTION find_similar_messages(
  query_embedding vector(1536),
  threshold FLOAT DEFAULT 0.8,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  message_content TEXT,
  sender VARCHAR,
  bullshit_score DECIMAL,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sa.id,
    sa.message_content,
    sa.sender,
    sa.bullshit_score,
    1 - (sa.message_embedding <=> query_embedding) as similarity
  FROM sage_analyses sa
  WHERE sa.message_embedding IS NOT NULL
  ORDER BY sa.message_embedding <=> query_embedding
  LIMIT limit_count;
END;
$$;

-- Function to update pattern library
CREATE OR REPLACE FUNCTION update_pattern_library()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pattern_threshold FLOAT := 0.85;
BEGIN
  -- This would run periodically to identify new patterns
  -- Group similar high-bullshit messages and create patterns
  
  -- Placeholder for clustering logic
  -- In production, this would use k-means or DBSCAN on embeddings
  
  RAISE NOTICE 'Pattern library update completed';
END;
$$;

-- View for real-time stats
CREATE OR REPLACE VIEW sage_stats AS
SELECT 
  COUNT(*) as total_analyzed,
  AVG(bullshit_score)::DECIMAL(3,2) as avg_bullshit_score,
  COUNT(CASE WHEN recommendation = 'DELETE' THEN 1 END) as deleted,
  COUNT(CASE WHEN recommendation = 'RESPOND' THEN 1 END) as responded,
  COUNT(CASE WHEN recommendation = 'INVESTIGATE' THEN 1 END) as investigated,
  COUNT(CASE WHEN bullshit_score > 0.8 THEN 1 END) as high_bullshit,
  COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24h,
  COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '7 days' THEN 1 END) as last_7d
FROM sage_analyses;

-- View for trending manipulation tactics
CREATE OR REPLACE VIEW trending_tactics AS
SELECT 
  tactic,
  COUNT(*) as occurrence_count,
  AVG(bullshit_score)::DECIMAL(3,2) as avg_bullshit_score
FROM (
  SELECT 
    jsonb_array_elements_text(analysis->'manipulation_tactics') as tactic,
    bullshit_score
  FROM sage_analyses
  WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
) tactics
GROUP BY tactic
ORDER BY occurrence_count DESC
LIMIT 20;

-- Function to get sender reputation
CREATE OR REPLACE FUNCTION get_sender_reputation(sender_name VARCHAR)
RETURNS TABLE(
  total_messages BIGINT,
  avg_bullshit_score DECIMAL,
  max_bullshit_score DECIMAL,
  common_tactics JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_messages,
    AVG(bullshit_score)::DECIMAL(3,2) as avg_bullshit_score,
    MAX(bullshit_score)::DECIMAL(3,2) as max_bullshit_score,
    jsonb_agg(DISTINCT jsonb_array_elements(analysis->'manipulation_tactics')) as common_tactics
  FROM sage_analyses
  WHERE sender ILIKE '%' || sender_name || '%'
  GROUP BY sender;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sage_analyses_updated_at
BEFORE UPDATE ON sage_analyses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_message_patterns_updated_at
BEFORE UPDATE ON message_patterns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Initial seed data for known patterns
INSERT INTO message_patterns (pattern_name, pattern_type, signature_phrases) VALUES
('Vanity Award Scam', 'vanity_award', ARRAY['honored', 'selected', 'excellence award', 'screening call', 'honoree']),
('Fake Connection Pitch', 'fake_connection', ARRAY['mutual connections', 'noticed we share', 'saw your profile']),
('Outsourcing Hustle', 'outsourcing_pitch', ARRAY['reduce costs', 'offshore team', 'staff augmentation']),
('Conference Upsell', 'conference_pitch', ARRAY['speaking opportunity', 'thought leader', 'share your expertise']),
('LinkedIn Automation', 'automation_spam', ARRAY['book a call', 'calendar link', '15-minute chat']);

-- Grant permissions for Supabase
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;