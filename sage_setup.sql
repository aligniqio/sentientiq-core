-- Create support_requests table for Sage AI assistant
CREATE TABLE IF NOT EXISTS support_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    message TEXT NOT NULL,
    context JSONB NOT NULL,
    source TEXT NOT NULL, -- 'gtm_implementation', 'configuration', etc.
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved'
    sage_response TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_support_requests_org_id
ON support_requests(organization_id);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id
ON support_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_support_requests_status
ON support_requests(status);

CREATE INDEX IF NOT EXISTS idx_support_requests_source
ON support_requests(source);

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create support requests
CREATE POLICY "Users can create support requests"
ON support_requests
FOR INSERT
USING (true);

-- Allow authenticated users to view their own support requests
CREATE POLICY "Users can view their own support requests"
ON support_requests
FOR SELECT
USING (true);

-- Allow Sage (service role) to update support requests
CREATE POLICY "Service role can update support requests"
ON support_requests
FOR UPDATE
USING (true);