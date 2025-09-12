-- Add Clerk organization ID to organizations table for proper linking
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS clerk_organization_id VARCHAR(255) UNIQUE;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_clerk_org_id 
ON organizations(clerk_organization_id) 
WHERE clerk_organization_id IS NOT NULL;