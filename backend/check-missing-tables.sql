-- Check which tenant tables are missing
-- Run this to see what needs to be created

-- Check for organizations table
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'organizations'
) AS organizations_exists;

-- Check for organization_members table
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'organization_members'
) AS organization_members_exists;

-- Check for api_keys table
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'api_keys'
) AS api_keys_exists;

-- Check for subscription_tiers table
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'subscription_tiers'
) AS subscription_tiers_exists;

-- If organizations exists, check if it has clerk_org_id column
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;