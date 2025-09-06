-- SMART NUCLEAR OPTION: Drop everything except pgvector extension functions
-- This preserves the vector extension while wiping everything else

-- First, drop all our custom views
DROP VIEW IF EXISTS high_bullshit_messages CASCADE;
DROP VIEW IF EXISTS sage_stats CASCADE;
DROP VIEW IF EXISTS trending_tactics CASCADE;

-- Drop our custom functions (not extension functions)
DROP FUNCTION IF EXISTS find_similar_messages CASCADE;
DROP FUNCTION IF EXISTS update_pattern_library CASCADE;
DROP FUNCTION IF EXISTS get_sender_reputation CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS get_trending_tactics CASCADE;

-- Now drop all tables (this is safe - won't affect extensions)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all tables in public schema
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', r.tablename;
    END LOOP;
    
    -- Drop all views in public schema
    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || quote_ident(r.viewname) || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', r.viewname;
    END LOOP;
    
    -- Drop all sequences that aren't owned by extensions
    FOR r IN (SELECT sequence_name FROM information_schema.sequences 
              WHERE sequence_schema = 'public') 
    LOOP
        BEGIN
            EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequence_name) || ' CASCADE';
            RAISE NOTICE 'Dropped sequence: %', r.sequence_name;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Skipped protected sequence: %', r.sequence_name;
        END;
    END LOOP;
    
    -- Drop non-extension functions only
    FOR r IN (
        SELECT p.proname, oidvectortypes(p.proargtypes) as args 
        FROM pg_proc p
        INNER JOIN pg_namespace n ON p.pronamespace = n.oid 
        LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
        WHERE n.nspname = 'public' 
        AND d.objid IS NULL  -- Not part of an extension
    ) 
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS public.' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
            RAISE NOTICE 'Dropped function: %', r.proname;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Skipped protected function: %', r.proname;
        END;
    END LOOP;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE 'CLEANED! pgvector extension preserved';
    RAISE NOTICE '====================================';
END $$;

-- Verify what's left
SELECT 'Tables remaining: ' || COUNT(*)::text FROM pg_tables WHERE schemaname = 'public';
SELECT 'Views remaining: ' || COUNT(*)::text FROM pg_views WHERE schemaname = 'public';

-- Check if pgvector is still there (it should be)
SELECT 'pgvector extension status: ' || CASE 
    WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') 
    THEN 'INSTALLED ✓' 
    ELSE 'NOT FOUND' 
END;

-- Now you're ready to run sage-schema-pgvector.sql