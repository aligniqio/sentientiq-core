-- Create initial super admin user
-- This ensures the first super admin can access the dashboard

-- Insert or update the super admin user
INSERT INTO users (
    email, 
    name, 
    role, 
    created_at
) VALUES (
    'info@sentientiq.ai',
    'SentientIQ Admin',
    'super_admin',
    NOW()
) ON CONFLICT (email) 
DO UPDATE SET 
    role = 'super_admin',
    updated_at = NOW();

-- Also add matt@aligniq.ai as super admin
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