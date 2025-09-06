-- NUCLEAR OPTION: Wipe Supabase Clean
-- Run this to remove ALL existing tables and start fresh

-- Drop all views first (they depend on tables)
DROP VIEW IF EXISTS high_bullshit_messages CASCADE;
DROP VIEW IF EXISTS sage_stats CASCADE;
DROP VIEW IF EXISTS trending_tactics CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS find_similar_messages CASCADE;
DROP FUNCTION IF EXISTS update_pattern_library CASCADE;
DROP FUNCTION IF EXISTS get_sender_reputation CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS get_trending_tactics CASCADE;

-- Drop all tables
DROP TABLE IF EXISTS sage_analyses CASCADE;
DROP TABLE IF EXISTS message_patterns CASCADE;
DROP TABLE IF EXISTS bullshit_signatures CASCADE;

-- Drop any other tables that might exist from previous experiments
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS swarm_analyses CASCADE;
DROP TABLE IF EXISTS emotional_labels CASCADE;
DROP TABLE IF EXISTS agent_outputs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Drop any sequences that might be hanging around
DROP SEQUENCE IF EXISTS sage_analyses_id_seq CASCADE;
DROP SEQUENCE IF EXISTS message_patterns_id_seq CASCADE;

-- Clean up any test data tables
DROP TABLE IF EXISTS test_data CASCADE;
DROP TABLE IF EXISTS temp_analyses CASCADE;

-- Remove any custom types
DROP TYPE IF EXISTS recommendation_type CASCADE;
DROP TYPE IF EXISTS entity_type CASCADE;
DROP TYPE IF EXISTS agent_status CASCADE;

-- Final confirmation
DO $$ 
BEGIN
    RAISE NOTICE 'Supabase has been wiped clean. Ready for fresh start with pgvector.';
END $$;