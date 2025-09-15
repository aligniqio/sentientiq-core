# SentientIQ v4 Implementation - Complete Handoff

## What We Built Today
From handoff document to production deployment, we implemented the complete SentientIQ v4 intervention system with real emotional physics flowing through the entire stack.

## Current State - WORKING IN PRODUCTION

### ✅ Emotion Detection (LIVE)
- **GTM Template**: Created and deployed "SentientIQ Detect" in Google Tag Manager
- **Detection Script**: `detect-v4.js` tracking 20 behaviors → 10 emotions
- **Real-time Dashboard**: Emotions flowing to `/realtime` scorecard
- **Production Tenant**: `sidk` configured for automotive dealership

### ✅ Backend Infrastructure (DEPLOYED)
- **Orchestrator**: Running on EC2 at port 8787 (api.sentientiq.app)
- **Database**: Supabase tables created:
  - `emotional_events` - storing all emotion data
  - `intervention_events` - tracking intervention fires
  - `intervention_configs` - tenant configurations
  - `organizations` - tenant management with `tenant_id`
- **API Endpoints**:
  - `/api/interventions/config/{tenantId}` - get config
  - `/api/interventions/event` - record intervention
  - `/api/interventions/stats` - dashboard metrics
  - `/api/interventions/metrics` - conversion tracking

### ✅ Configuration System (COMPLETE)
- **Configuration Wizard**: `/system/configuration`
  - 5-step flow: Brand → Offers → Channels → CRM → Interventions
  - Automotive template with specific offers (cash back, APR, test drives)
  - Custom template for complete flexibility
  - CRM connection without OAuth (API keys only)
- **Two Active Tenants**:
  - `demo_tenant` - SaaS template
  - `sidk` - Automotive dealership template

### ⏳ Interventions (READY TO ACTIVATE)
- **Script**: `interventions-v4.js` deployed to sentientiq.ai
- **GTM Issue**: Template references `cdn.sentientiq.app` but site is at `sentientiq.ai`
- **Quick Fix**: Update GTM template URL from `.app` to `.ai`

## Critical Information

### Production Access
```bash
# SSH to EC2
ssh -i ~/.ssh/collective-backend.pem ec2-user@api.sentientiq.app

# Orchestrator is running via PM2
pm2 status
pm2 logs orchestrator

# Restart if needed
cd /home/ec2-user/orchestrator
pm2 restart orchestrator
```

### Database Access
- **Supabase Project**: sentientiq-core
- **Key Tables**:
  - `organizations` - has `tenant_id` column for cleaner API access
  - `intervention_configs` - stores all tenant configurations
  - `emotional_events` - real-time emotion stream
  - `intervention_events` - tracks intervention performance

### GTM Configuration
- **Template Name**: SentientIQ Detect
- **Current Tenant ID**: `sidk` (automotive)
- **API Key**: `sq_live_sidk_test`
- **Script URL Issue**: Change `cdn.sentientiq.app` to `sentientiq.ai` in template

### Local Development
```bash
# Frontend (React app)
cd /Users/matthewkiselstein/projects/sentientiq-core
npm run dev  # Runs on port 5173

# Marketing site
cd marketing-website
npm run dev  # Runs on port 3000

# Orchestrator
cd orchestrator
PORT=8787 npm run dev
```

## What's NOT Working Yet

### Interventions Not Firing
**Root Cause**: GTM template loads from wrong domain
**Solution**: In GTM template, change:
```javascript
// FROM:
const scriptUrl = 'https://cdn.sentientiq.app/interventions-v4.js?tenant=' +

// TO:
const scriptUrl = 'https://sentientiq.ai/interventions-v4.js?tenant=' +
```

### CRM Integration
- Backend ready with HubSpot/Salesforce integration code
- Frontend configured for API keys (no OAuth)
- Not tested with real CRM yet

## Philosophy Implemented

### "WE SUCK!" Approach
- NO mock data anywhere
- Honest empty states
- Real failures over fake success
- If config missing: 503 error, not demo data

### Minimal Interruption Design
- Glassmorphism UI
- Transparency everywhere
- Behavioral physics, not rules
- "Claude time ain't people time"

## Next Steps

1. **Fix GTM Template Domain** (1 minute)
   - Change `.app` to `.ai` in template
   - Republish GTM container
   - Interventions will start firing immediately

2. **Test Intervention Triggers**
   - Exit intent: Move mouse to browser tabs
   - Price hover: Hover on pricing elements
   - Confusion: Rapid scrolling or circular mouse movement

3. **Connect Real CRM** (optional)
   - HubSpot: Create Private App, copy API key
   - Salesforce: Use Connected App JWT
   - Or use Zapier webhook for any CRM

## File Structure
```
/sentientiq-core
├── /src                      # React app
│   ├── /pages/system
│   │   ├── configuration.tsx # Intervention config wizard
│   │   └── implementation.tsx # GTM setup guide
│   └── /pages/realtime.tsx   # Emotion dashboard
├── /marketing-website
│   └── /public
│       ├── detect-v4.js      # Emotion detection
│       └── interventions-v4.js # Intervention system
├── /orchestrator
│   └── /src/api
│       └── intervention-config-api.ts # Core API
└── *.sql files               # Database setup scripts
```

## Testing Checklist

- [x] Emotions detecting in real-time
- [x] Dashboard showing live data
- [x] Configuration saved to database
- [x] GTM template installed
- [ ] Interventions firing (needs domain fix)
- [ ] CRM data syncing (needs real CRM)

## Support & Troubleshooting

### Console Commands
```javascript
// Check if interventions script loaded
document.querySelectorAll('script[src*="interventions"]')

// Check tenant ID
localStorage.getItem('tenantId')

// Force set tenant
localStorage.setItem('tenantId', 'sidk')
```

### Common Issues
1. **No emotions**: Check if GTM tag is firing
2. **No interventions**: Check script domain (.ai vs .app)
3. **Wrong tenant**: Set localStorage tenantId
4. **API errors**: Check orchestrator is running on 8787

## Summary
We built a complete behavioral intervention system that detects emotional states and can trigger contextual interventions. The emotional physics are flowing perfectly. Only one small domain fix needed to see interventions fire. No OAuth complexity, no mock data, just honest software that actually works.

"Marketing at the Speed of Emotion™" - and it's real.