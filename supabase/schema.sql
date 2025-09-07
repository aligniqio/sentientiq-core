-- Supabase schema for SentientIQ
-- Run this in Supabase SQL editor to recreate tables

-- Check if table exists and create/alter as needed
DO $$ 
BEGIN
  -- If 'user' table exists, add missing columns
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user') THEN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='user' AND column_name='role') THEN
      ALTER TABLE "user" ADD COLUMN role TEXT DEFAULT 'user' 
        CHECK (role IN ('user', 'tenant', 'tenant_admin', 'super_admin'));
    END IF;
    
    -- Add subscription_tier if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='user' AND column_name='subscription_tier') THEN
      ALTER TABLE "user" ADD COLUMN subscription_tier TEXT DEFAULT 'free' 
        CHECK (subscription_tier IN ('free', 'pro', 'team', 'enterprise'));
    END IF;
    
    -- Add questions_asked if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='user' AND column_name='questions_asked') THEN
      ALTER TABLE "user" ADD COLUMN questions_asked INTEGER DEFAULT 0;
    END IF;
    
    -- Add questions_limit if it doesn't exist
    IF NOT EXISTS (SELECT column_name FROM information_schema.columns 
                   WHERE table_name='user' AND column_name='questions_limit') THEN
      ALTER TABLE "user" ADD COLUMN questions_limit INTEGER DEFAULT 20;
    END IF;
  ELSE
    -- Create the user table if it doesn't exist
    CREATE TABLE "user" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_user_id TEXT UNIQUE,
      email TEXT NOT NULL,
      company_name TEXT,
      role TEXT DEFAULT 'user' CHECK (role IN ('user', 'tenant', 'tenant_admin', 'super_admin')),
      subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'team', 'enterprise')),
      questions_asked INTEGER DEFAULT 0,
      questions_limit INTEGER DEFAULT 20,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END $$;

-- Usage tracking
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site analyses
CREATE TABLE IF NOT EXISTS site_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  analysis_data JSONB,
  recommendations JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sage analysis history
CREATE TABLE IF NOT EXISTS sage_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  message TEXT,
  sender TEXT,
  analysis JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents for RAG
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_analyses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own data" ON "user";
DROP POLICY IF EXISTS "Users can update own data" ON "user";
DROP POLICY IF EXISTS "Users can view own usage" ON usage_events;
DROP POLICY IF EXISTS "Users can insert own usage" ON usage_events;
DROP POLICY IF EXISTS "Users can view own analyses" ON site_analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON site_analyses;

-- RLS Policies for user table
-- Note: Since we're using Clerk, auth.uid() won't work
-- We'll need to handle this differently or disable RLS for now
CREATE POLICY "Users can view own data" ON "user"
  FOR SELECT USING (true); -- Temporarily allow all reads

CREATE POLICY "Users can update own data" ON "user"
  FOR UPDATE USING (true); -- Temporarily allow all updates

-- For other tables, also allow for now
CREATE POLICY "Users can view own usage" ON usage_events
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own usage" ON usage_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own analyses" ON site_analyses
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own analyses" ON site_analyses
  FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_clerk_id ON "user"(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_usage_user_id ON usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON site_analyses(user_id);

-- Function to match documents (for RAG)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'::jsonb
) RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;