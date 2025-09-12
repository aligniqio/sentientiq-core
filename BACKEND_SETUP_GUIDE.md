# Backend Setup Guide - SentientIQ

## ✅ Completed Setup

### 1. Database Schema
- **Location**: `/supabase/migrations/001_complete_schema.sql`
- **Status**: ✅ Applied to Supabase
- **Features**:
  - Organizations (tenants) table with white-label support
  - Users table synced with Clerk
  - Memberships for many-to-many relationships
  - Emotional events tracking
  - Identity resolution
  - Interventions system
  - Accountability scorecards
  - Full audit logging

### 2. API Endpoints
- **Invite User**: `/netlify/functions/invite-user.js`
  - Handles Clerk invitations
  - Syncs with Supabase
  - Supports existing and new users

### 3. Super Admin Dashboard
- **Location**: `/src/pages/super-admin.tsx`
- **Features**:
  - Create organizations (standard or agency/white-label)
  - Invite users to organizations
  - View all organizations
  - Delete organizations
  - Switch context between organizations

## 🔧 Environment Variables Required

Add these to your `.env` file and Netlify environment:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_webhook_secret

# Stripe (existing)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret
```

## 🚀 Testing the Setup

### 1. Test Super Admin Access
```bash
# Run locally
npm run dev

# Navigate to
http://localhost:5173/super-admin

# Should only work for:
- matt@aligniq.ai
- info@sentientiq.ai
- Any email containing "kiselstein"
```

### 2. Test Organization Creation
1. Click "Add Organization"
2. Fill in:
   - Company Name: "Test Company"
   - Admin Email: "test@example.com"
   - Type: Standard or Agency
3. Click "Create Tenant"
4. Verify in Supabase:
```sql
SELECT * FROM organizations ORDER BY created_at DESC LIMIT 1;
```

### 3. Test User Invitation
1. Click the green user icon next to an organization
2. Fill in:
   - Name: "Test User"
   - Email: "testuser@example.com"
   - Role: User/Admin/Owner
3. Click "Add User"
4. Verify in Supabase:
```sql
SELECT * FROM memberships WHERE user_email = 'testuser@example.com';
```

### 4. Test Clerk Webhook (Production)
1. Set up webhook in Clerk Dashboard:
   - Endpoint: `https://yourdomain.com/.netlify/functions/clerk-webhook`
   - Events: All user and organization events
2. Copy the webhook secret to `CLERK_WEBHOOK_SECRET`

## 📊 Database Naming Conventions

All tables use **snake_case** naming:
- `organizations` (not Organizations or orgs)
- `user_id` (not userId or UserID)
- `company_name` (not companyName)
- `is_white_label` (not isWhiteLabel)

## 🔍 Common Queries

### Get all organizations with member counts
```sql
SELECT 
  o.*,
  COUNT(DISTINCT m.user_id) as member_count
FROM organizations o
LEFT JOIN memberships m ON m.organization_id = o.id
GROUP BY o.id
ORDER BY o.created_at DESC;
```

### Get user's organizations
```sql
SELECT * FROM get_user_organizations('clerk_user_id_here');
```

### Check if user is super admin
```sql
SELECT is_super_admin('clerk_user_id_here');
```

### View recent emotional events
```sql
SELECT 
  ee.*,
  o.company_name
FROM emotional_events ee
JOIN organizations o ON o.id = ee.organization_id
ORDER BY ee.detected_at DESC
LIMIT 100;
```

## 🐛 Troubleshooting

### Issue: "No unique constraint" error
**Solution**: The schema has been updated with proper unique constraints:
- Users: `email` and `clerk_user_id` are unique
- Memberships: `(user_id, organization_id)` and `(user_email, organization_id)` are unique

### Issue: Cannot invite users
**Check**:
1. Netlify function is deployed: `netlify functions:list`
2. Clerk API key is valid
3. Supabase service key has proper permissions

### Issue: Organizations not showing
**Check**:
1. Supabase connection is established
2. RLS policies aren't blocking (service role bypasses RLS)
3. Check browser console for errors

## 🎯 Next Steps for Backend (from BACKEND_TODO.md)

1. **Identity Resolution Service** (`/orchestrator/src/services/identity-resolution.ts`)
   - Link sessions to users
   - Calculate LTV
   - Company identification

2. **Emotion Detection Pipeline** (`/orchestrator/src/services/emotion-detector.ts`)
   - Port behavioral physics from frontend
   - Server-side validation
   - Confidence scoring

3. **WebSocket Handler** (`/orchestrator/src/websocket/emotion-stream.ts`)
   - Real-time event streaming
   - <300ms response time
   - 10k concurrent connections

## 📝 Notes

- The database preserves all `sage_*` tables for the AI feature
- Super admin emails are hardcoded in the schema and component
- White-label organizations can have child organizations
- Revenue sharing is tracked for agency partners
- All timestamps are in UTC

## 🔐 Security Considerations

1. **Super Admin Protection**: Only specific emails can access
2. **Service Role**: Used for backend operations, bypasses RLS
3. **Clerk Integration**: Handles auth, we sync to Supabase
4. **Audit Logging**: All actions are logged in `audit_log` table

---

*Last Updated: 2025-09-11*