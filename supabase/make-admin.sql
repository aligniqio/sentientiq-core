-- Make admins super admins
-- Run this AFTER running schema.sql

UPDATE "user" 
SET role = 'super_admin'
WHERE email IN ('matt@sentientiq.ai', 'info@sentientiq.ai');

-- Verify it worked
SELECT id, email, role, subscription_tier 
FROM "user" 
WHERE email IN ('matt@sentientiq.ai', 'info@sentientiq.ai');