-- TOTAL NUCLEAR OPTION: Drop EVERYTHING in public schema
-- This will destroy ALL tables, views, functions, etc.

-- Drop all tables in public schema (including Supabase default tables if you want them gone)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all views first
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', r.viewname;
    END LOOP;
    
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    -- Drop all sequences
    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') 
    LOOP
        EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
        RAISE NOTICE 'Dropped sequence: %', r.sequence_name;
    END LOOP;
    
    -- Drop all functions
    FOR r IN (SELECT proname, oidvectortypes(proargtypes) as args 
              FROM pg_proc 
              INNER JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
              WHERE pg_namespace.nspname = 'public') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
        RAISE NOTICE 'Dropped function: %', r.proname;
    END LOOP;
    
    -- Drop all types
    FOR r IN (SELECT typname FROM pg_type 
              WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
              AND typtype = 'e') 
    LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        RAISE NOTICE 'Dropped type: %', r.typname;
    END LOOP;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'PUBLIC SCHEMA COMPLETELY WIPED CLEAN';
    RAISE NOTICE '====================================';
END $$;

-- Verify it's empty
SELECT 'Tables remaining: ' || COUNT(*)::text FROM pg_tables WHERE schemaname = 'public';
SELECT 'Views remaining: ' || COUNT(*)::text FROM pg_views WHERE schemaname = 'public';

-- IF YOU WANT TO KEEP SUPABASE AUTH TABLES:
-- Comment out the above and use this more selective approach:
/*
DROP TABLE IF EXISTS sage_analyses CASCADE;
DROP TABLE IF EXISTS message_patterns CASCADE;
DROP TABLE IF EXISTS bullshit_signatures CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS swarm_analyses CASCADE;
DROP TABLE IF EXISTS emotional_labels CASCADE;
DROP TABLE IF EXISTS agent_outputs CASCADE;
-- Add any other specific tables you want gone
*/