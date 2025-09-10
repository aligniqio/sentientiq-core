-- Add super_admin column to tenant_memberships if it doesn't exist
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Update Matt's tenant to enterprise
UPDATE tenants 
SET plan = 'enterprise'
WHERE id = '7a6c61c4-95e4-4b15-94b8-02995f81c291';

-- Grant super admin to Matt (find by email in users table)
UPDATE memberships 
SET is_super_admin = true
WHERE tenant_id = '7a6c61c4-95e4-4b15-94b8-02995f81c291'
AND user_id IN (SELECT id FROM users WHERE email = 'info@sentientiq.ai');

-- Verify the changes
SELECT t.id, t.company_name, t.plan,
       tm.user_id, tm.is_super_admin
FROM tenants t
JOIN memberships tm ON t.id = tm.tenant_id
WHERE t.id = '7a6c61c4-95e4-4b15-94b8-02995f81c291';