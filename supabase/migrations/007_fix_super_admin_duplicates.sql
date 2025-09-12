-- Fix duplicate super admin records and ensure clean state

-- First, delete any duplicate records for info@sentientiq.ai (keep the oldest one)
DELETE FROM users 
WHERE email = 'info@sentientiq.ai' 
AND id NOT IN (
    SELECT id 
    FROM users 
    WHERE email = 'info@sentientiq.ai'
    ORDER BY created_at ASC
    LIMIT 1
);

-- Delete any duplicate records for matt@aligniq.ai (keep the oldest one)
DELETE FROM users 
WHERE email = 'matt@aligniq.ai' 
AND id NOT IN (
    SELECT id 
    FROM users 
    WHERE email = 'matt@aligniq.ai'
    ORDER BY created_at ASC
    LIMIT 1
);

-- Now ensure we have exactly one super admin record for each email
-- Update or insert for info@sentientiq.ai with the Clerk ID
INSERT INTO users (
    email, 
    name, 
    role,
    clerk_user_id,
    created_at
) VALUES (
    'info@sentientiq.ai',
    'SentientIQ Admin',
    'super_admin',
    'user_2zZ59bWotlSk5kLkrLKRtMMxDAn', -- Your Clerk ID from the debug output
    NOW()
) ON CONFLICT (email) 
DO UPDATE SET 
    role = 'super_admin',
    clerk_user_id = 'user_2zZ59bWotlSk5kLkrLKRtMMxDAn',
    updated_at = NOW();

-- Also ensure matt@aligniq.ai exists as super admin (without Clerk ID for now)
INSERT INTO users (
    email, 
    name, 
    role,
    created_at
) VALUES (
    'matt@aligniq.ai',
    'Matt',
    'super_admin',
    NOW()
) ON CONFLICT (email) 
DO UPDATE SET 
    role = 'super_admin',
    updated_at = NOW();

-- Verify the fix
SELECT email, role, clerk_user_id FROM users WHERE role = 'super_admin';