-- Add tenant_id to organizations table for cleaner API usage
-- This provides a simpler identifier than clerk_org_id

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS tenant_id TEXT UNIQUE;

-- Generate tenant IDs for existing organizations
UPDATE organizations
SET tenant_id = 'tenant_' || substr(md5(clerk_org_id), 1, 8)
WHERE tenant_id IS NULL;

-- Make it required for future inserts
ALTER TABLE organizations
ALTER COLUMN tenant_id SET NOT NULL;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_organizations_tenant_id ON organizations(tenant_id);

-- For testing, you can manually set a nice tenant_id:
-- UPDATE organizations
-- SET tenant_id = 'auto_dealer_1'
-- WHERE clerk_org_id = 'YOUR_CLERK_ORG_ID';