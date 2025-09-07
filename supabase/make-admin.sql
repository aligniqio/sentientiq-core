-- Make matt@sentientiq.ai a super admin
-- Run this AFTER running schema.sql

UPDATE "user" 
SET role = 'super_admin'
WHERE email = 'matt@sentientiq.ai';

-- Verify it worked
SELECT id, email, role, subscription_tier 
FROM "user" 
WHERE email = 'matt@sentientiq.ai';