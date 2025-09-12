-- First check if RLS is enabled
DO $$ 
BEGIN
    -- Check current RLS status
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'users' 
        AND schemaname = 'public'
    ) THEN
        -- Disable RLS for now to allow the app to check super admin status
        -- Since we're using Clerk for auth, not Supabase auth
        ALTER TABLE users DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Alternative: If you want to keep RLS enabled, create a very permissive policy
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- 
-- DROP POLICY IF EXISTS "Allow all reads for super admin checks" ON users;
-- CREATE POLICY "Allow all reads for super admin checks" ON users
--     FOR SELECT
--     USING (true);