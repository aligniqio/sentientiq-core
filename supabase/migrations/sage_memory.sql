-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Sage's memory palace
CREATE TABLE sage_memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Memory content
  content TEXT NOT NULL,
  context JSONB DEFAULT '{}', -- who, what, where metadata
  memory_type TEXT CHECK (memory_type IN ('observation', 'pattern', 'joke', 'roast', 'insight', 'callback')),
  
  -- Emotional metadata
  authenticity_score DECIMAL(3,2), -- 0.00 to 1.00
  manipulation_flags TEXT[],
  emotional_state TEXT,
  
  -- Vector embedding for similarity search
  embedding VECTOR(1536), -- OpenAI ada-002 dimensions
  
  -- Relationships
  user_id UUID REFERENCES auth.users(id),
  conversation_id TEXT,
  related_memory_ids UUID[],
  
  -- Sage's personal notes
  sage_commentary TEXT,
  times_referenced INT DEFAULT 0,
  last_referenced TIMESTAMPTZ
);

-- Index for vector similarity search
CREATE INDEX sage_memories_embedding_idx ON sage_memories 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for quick lookups
CREATE INDEX sage_memories_user_idx ON sage_memories(user_id);
CREATE INDEX sage_memories_conversation_idx ON sage_memories(conversation_id);
CREATE INDEX sage_memories_type_idx ON sage_memories(memory_type);

-- Sage's pattern recognition table
CREATE TABLE sage_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  pattern_name TEXT UNIQUE NOT NULL,
  pattern_description TEXT,
  
  -- Pattern matching rules
  trigger_keywords TEXT[],
  trigger_context JSONB,
  
  -- Sage's responses
  responses TEXT[], -- Array of possible responses
  snark_level INT DEFAULT 5, -- 1-10 scale
  
  times_triggered INT DEFAULT 0,
  last_triggered TIMESTAMPTZ
);

-- Function to find similar memories
CREATE OR REPLACE FUNCTION find_similar_memories(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.8,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  context JSONB,
  memory_type TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.content,
    m.context,
    m.memory_type,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM sage_memories m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to increment reference count
CREATE OR REPLACE FUNCTION reference_memory(memory_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE sage_memories 
  SET 
    times_referenced = times_referenced + 1,
    last_referenced = NOW()
  WHERE id = memory_id;
END;
$$;