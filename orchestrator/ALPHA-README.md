# SentientIQ Alpha Deployment - Quick Start

**Get emotional detection running for 4 alpha users in 30 minutes.**

## What This Gives You

✅ **Real emotional detection** - Detect frustration, excitement, confusion, etc.  
✅ **Real interventions** - Pop-ups, chat widgets, help offers when users struggle  
✅ **Real WebSocket streaming** - Live emotional state to your frontend  
🟡 **Stubbed data lake** - Events go to Supabase instead of S3/Athena  
🟡 **Stubbed notifications** - Alerts go to Slack instead of Twilio  

## 30-Minute Setup

### Step 1: Environment (5 min)
```bash
cd orchestrator
npm install
cp .env.example .env
```

Edit `.env`:
```bash
DEPLOYMENT_MODE=alpha
OPENAI_API_KEY=your-openai-key
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
PORT=8787
```

### Step 2: Database Setup (10 min)
1. Create free Supabase project at https://supabase.com
2. Go to SQL Editor in Supabase dashboard
3. Copy/paste contents of `scripts/supabase-schema.sql`
4. Execute the SQL

### Step 3: Deploy (5 min)
```bash
npm run build
npm start
```

### Step 4: Verify (5 min)
```bash
npm run test:deployment
```

### Step 5: Connect Frontend (5 min)
Point your frontend to:
- WebSocket: `ws://localhost:8787/ws`
- API: `http://localhost:8787/api`
- Health: `http://localhost:8787/health`

## What's Different in Alpha

| Component | Production | Alpha |
|-----------|------------|-------|
| **Emotions** | Computer vision + NLP | ✅ Same (never stubbed) |
| **Interventions** | ML-driven triggers | ✅ Same (never stubbed) |
| **WebSockets** | Real-time streaming | ✅ Same (never stubbed) |
| **Data Storage** | S3 + Parquet | 🟡 Supabase tables |
| **Analytics** | Athena queries | 🟡 Simple SQL views |
| **Notifications** | Twilio SMS/calls | 🟡 Slack messages |
| **CEO Alerts** | Email + dashboard | 🔒 Feature flagged |
| **EVI Calculations** | Complex ML models | 🔒 Feature flagged |

## Key Files Created

- `/src/config/deployment-mode.ts` - Runtime configuration
- `/src/services/pipeline-stubs.ts` - Graceful degradation services
- `/DEPLOYMENT.md` - Full deployment guide
- `/scripts/supabase-schema.sql` - Database schema for stubs
- `/scripts/test-deployment.js` - Verification script

## Monitoring Your Alpha

Visit these URLs after deployment:

- **Health Check**: http://localhost:8787/health
  - Shows core system status and what's stubbed
  
- **Feature Status**: http://localhost:8787/features
  - Shows which features are enabled/disabled
  
- **Deployment Info**: http://localhost:8787/deployment
  - Shows deployment mode and readiness

## Progressive Feature Enablement

Add to `.env` when ready:
```bash
ENABLE_CEO_ALERTS=true
ENABLE_DEAL_INTELLIGENCE=true  
ENABLE_EVI_CALCULATIONS=true
```

## Supabase Analytics Queries

Query your emotional events:
```sql
-- Emotion distribution last 24h
SELECT emotion, COUNT(*) as count 
FROM emotional_events 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY emotion ORDER BY count DESC;

-- Intervention effectiveness by company  
SELECT * FROM get_intervention_effectiveness('your-company-id');

-- Company overview
SELECT * FROM company_emotion_stats 
WHERE company_id = 'your-company-id';
```

## Troubleshooting

**Server won't start?**
1. Check `.env` has required values
2. Verify Supabase credentials
3. Run `npm run test:deployment`

**No emotions detected?**  
1. Check browser console for WebSocket connection
2. Verify emotion detection feature flag enabled
3. Check server logs for errors

**Events not saving?**
1. Test Supabase connection in SQL editor
2. Verify schema was created correctly
3. Check RLS policies in Supabase

**Slack notifications not working?**
1. Test webhook URL with curl
2. Check channel permissions
3. Verify webhook format

## Migration to Production

When ready to scale beyond 4 users:

1. **Add AWS credentials** for S3/Athena
2. **Add Twilio credentials** for real notifications  
3. **Change deployment mode** to `beta` or `production`
4. **System automatically switches** from stubs to real infrastructure

## Support

This is alpha software optimized for **proving the emotional detection works**. 

Core systems (emotions, interventions, WebSocket streaming) are production-ready.  
Infrastructure stubs are pragmatic shortcuts that work for alpha users.

Scale the infrastructure as you prove product-market fit.

---

**Remember**: We're proving the physics work, not showing off devops. Deploy fast. Scale smart.