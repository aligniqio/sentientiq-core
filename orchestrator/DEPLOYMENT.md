# SentientIQ Alpha Deployment Guide

**Pragmatic deployment for 4 alpha users - Core emotions TODAY, infrastructure later.**

## Philosophy

Deploy the core emotional detection physics that work, stub the heavy infrastructure that doesn't matter yet. Get real emotions and interventions flowing to alpha users within hours, not weeks.

## Quick Start (Alpha Mode)

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)
- Slack workspace with webhook capability
- 30 minutes of your time

### Step 1: Environment Setup

```bash
# Clone and install
cd /path/to/sentientiq-core/orchestrator
npm install

# Copy environment template
cp .env.example .env
```

### Step 2: Configure Alpha Mode

Edit `.env` with these **REQUIRED** settings:

```bash
# Deployment Mode - THE MOST IMPORTANT SETTING
DEPLOYMENT_MODE=alpha

# Core LLM providers (at least one required)
OPENAI_API_KEY=sk-openai...
# OR
ANTHROPIC_API_KEY=sk-ant...

# Supabase (REQUIRED for alpha - replaces S3)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Slack notifications (REQUIRED for alpha - replaces Twilio)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Server
PORT=8787
```

### Step 3: Create Supabase Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Emotional events table (replaces S3/Athena for alpha)
CREATE TABLE emotional_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  vertical TEXT NOT NULL,
  geography TEXT NOT NULL,
  emotion TEXT NOT NULL,
  confidence DECIMAL(5,2) NOT NULL,
  intensity DECIMAL(5,2) NOT NULL,
  dollar_value DECIMAL(10,2) DEFAULT 0,
  intervention_taken BOOLEAN DEFAULT false,
  outcome TEXT,
  page_url TEXT,
  element_target TEXT,
  user_agent TEXT,
  metadata JSONB
);

-- Index for performance
CREATE INDEX idx_emotional_events_timestamp ON emotional_events(timestamp DESC);
CREATE INDEX idx_emotional_events_company ON emotional_events(company_id, timestamp DESC);
CREATE INDEX idx_emotional_events_emotion ON emotional_events(emotion, timestamp DESC);
```

### Step 4: Deploy

```bash
# Start the server
npm start

# OR with PM2 for production
pm2 start dist/server.js --name sentientiq-orchestrator
```

### Step 5: Verify Health

Visit `http://localhost:8787/health` - you should see:

```json
{
  "status": "healthy",
  "mode": "alpha",
  "checks": {
    "emotions": { "healthy": true, "stubbed": false },
    "interventions": { "healthy": true, "stubbed": false }, 
    "websockets": { "healthy": true, "stubbed": false },
    "dataLake": { "healthy": true, "stubbed": true, "backend": "supabase" },
    "notifications": { "healthy": true, "stubbed": true, "backend": "slack" }
  }
}
```

🎉 **You're live!** Core emotions and interventions are running. Data flows to Supabase. Alerts go to Slack.

## Progressive Feature Enablement

Enable advanced features as you're ready:

### CEO Alerts
```bash
ENABLE_CEO_ALERTS=true
```

### Deal Intelligence  
```bash
ENABLE_DEAL_INTELLIGENCE=true
```

### EVI Calculations
```bash
ENABLE_EVI_CALCULATIONS=true
```

## Migration to Full Infrastructure

When ready to scale beyond alpha (beta/production):

### Step 1: AWS Infrastructure
```bash
# Add to .env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
EVENT_LAKE_BUCKET=your-s3-bucket
ATHENA_WORKGROUP=primary
```

### Step 2: Twilio Notifications
```bash
# Add to .env
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Step 3: Upgrade Deployment Mode
```bash
# Change in .env
DEPLOYMENT_MODE=beta  # or production
```

The system automatically switches from stubs to real infrastructure when credentials are detected.

## Troubleshooting

### "No emotions detected"
- Check WebSocket connection in browser dev tools
- Verify emotion detection models are loaded
- Check browser console for JavaScript errors

### "Events not saving" 
- Verify Supabase credentials in `.env`
- Check Supabase table exists with correct schema
- Look for "Supabase stub healthy" in health check

### "No interventions triggering"
- Verify intervention engine is enabled in health check
- Check intervention rules configuration
- Look for intervention logs in console

### "Slack notifications not working"
- Verify SLACK_WEBHOOK_URL is correct
- Test webhook manually with curl
- Check Slack channel permissions

## Development vs Alpha vs Production

| Feature | Development | Alpha | Beta | Production |
|---------|-------------|-------|------|------------|
| Emotions | ✅ | ✅ | ✅ | ✅ |
| Interventions | ✅ | ✅ | ✅ | ✅ |
| WebSockets | ✅ | ✅ | ✅ | ✅ |
| Data Lake | Stub (logs) | Stub (Supabase) | Real (S3) | Real (S3) |
| Analytics | Stub (memory) | Stub (Supabase) | Real (Athena) | Real (Athena) |
| Notifications | Stub (console) | Stub (Slack) | Real (Twilio) | Real (Twilio) |
| Batch Size | 10 | 50 | 500 | 1000 |
| Flush Interval | 5s | 15s | 30s | 30s |

## What's Stubbed in Alpha

✅ **Always Real (Never Stubbed):**
- Emotion detection and processing
- Intervention engine and triggers
- WebSocket streaming to frontend
- User session management

🟡 **Gracefully Stubbed:**
- S3/Athena → Supabase tables
- Twilio SMS/calls → Slack messages  
- CloudWatch metrics → Console logs
- Complex analytics → Simple aggregations

❌ **Not Available in Alpha:**
- Advanced predictive modeling
- Cross-tenant analytics
- Real-time CEO dashboards
- Revenue forensics deep-dive

## Monitoring

### Health Check Endpoint
`GET /health` - System health and stub status

### Deployment Status  
`GET /deployment` - Feature flags and configuration

### Metrics (Alpha)
Basic metrics available in Supabase:
```sql
-- Emotion distribution last 24h
SELECT emotion, COUNT(*) as count 
FROM emotional_events 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY emotion 
ORDER BY count DESC;

-- Intervention rate by company
SELECT company_id, 
       COUNT(*) as total_events,
       SUM(CASE WHEN intervention_taken THEN 1 ELSE 0 END) as interventions,
       ROUND(100.0 * SUM(CASE WHEN intervention_taken THEN 1 ELSE 0 END) / COUNT(*), 2) as intervention_rate
FROM emotional_events 
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY company_id
ORDER BY intervention_rate DESC;
```

## Security Notes

### Alpha Security Model
- Internal/trusted users only
- No public API endpoints
- Basic auth via environment variables
- Supabase RLS policies recommended

### Production Security Checklist
- [ ] API authentication/authorization
- [ ] HTTPS/TLS certificates  
- [ ] VPC/network security
- [ ] Secrets management (AWS Secrets Manager)
- [ ] Database encryption at rest
- [ ] Audit logging
- [ ] Rate limiting
- [ ] DDoS protection

## Support

For alpha deployment issues:
1. Check health endpoint first
2. Review console logs for errors
3. Verify environment variables
4. Test Supabase/Slack connectivity
5. Check this deployment guide

The goal is **emotions working in 30 minutes**, not 30 hours. Stub everything except the core physics.

---

*Remember: We're proving the emotional detection works, not showing off infrastructure. Deploy pragmatically. Scale systematically.*