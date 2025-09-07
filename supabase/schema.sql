-- Supabase schema for SentientIQ
-- Run this in Supabase SQL editor to recreate tables

-- Users table (linked to Clerk)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'team', 'enterprise')),
  questions_asked INTEGER DEFAULT 0,
  questions_limit INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see/edit their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (clerk_user_id = auth.uid()::text OR role = 'admin' OR role = 'super_admin');

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can view own usage" ON usage_events
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own usage" ON usage_events
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can view own analyses" ON site_analyses
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own analyses" ON site_analyses
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
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