# 🚀 WEEKEND DEPLOYMENT - EC2 LIVE BY MONDAY

**Your existing infrastructure:**
- ✅ EC2 instance at 98.87.12.130
- ✅ Clerk authentication configured
- ✅ Supabase database ready
- ✅ Stripe payments integrated
- ✅ pm2 managing processes

## 30-MINUTE DEPLOYMENT CHECKLIST

### 1️⃣ Prepare Environment File (5 min)
```bash
cd orchestrator
cp .env.example .env.production

# Edit .env.production with your EXISTING credentials:
# - CLERK_SECRET_KEY (from Clerk dashboard)
# - CLERK_WEBHOOK_SECRET (from Clerk webhooks)
# - SUPABASE_URL (your existing Supabase)
# - SUPABASE_SERVICE_ROLE_KEY (your existing key)
# - STRIPE_SECRET_KEY (your existing Stripe)
# - SLACK_WEBHOOK_URL (create one for alerts)
```

### 2️⃣ Install Dependencies Locally (2 min)
```bash
cd orchestrator
npm install svix jsonwebtoken jwks-rsa @types/jsonwebtoken
npm run build  # Verify it builds
```

### 3️⃣ Deploy to EC2 (5 min)
```bash
chmod +x scripts/ec2-deploy.sh
EC2_HOST=98.87.12.130 ./scripts/ec2-deploy.sh
```

### 4️⃣ Verify on EC2 (2 min)
```bash
# SSH to check
ssh -i .ssh/collective-backend.pem ec2-user@98.87.12.130

# On EC2:
pm2 status  # Should show orchestrator-streaming
pm2 logs orchestrator-streaming --lines 50
curl http://localhost:8787/health  # Should return healthy
```

### 5️⃣ Install SDK on First Customer (5 min)

Add to their site's `<head>`:
```html
<script>
  window.SENTIENTIQ_CONFIG = {
    apiKey: 'YOUR_API_KEY',  // Get from Clerk/Stripe customer metadata
    apiUrl: 'http://98.87.12.130:8787',
    userId: currentUser?.id,  // From their auth system
    userEmail: currentUser?.email,
    companyId: currentUser?.organizationId,
    debug: true  // Remove in production
  };
</script>
<script src="http://98.87.12.130:8787/sdk.js" async></script>
```

### 6️⃣ Watch Emotions Flow (∞ min)
```bash
# Monitor real-time
ssh -i .ssh/collective-backend.pem ec2-user@98.87.12.130
pm2 logs orchestrator-streaming --follow

# Check Slack for high-value alerts
# Check Supabase for emotion events
```

## WHAT'S RUNNING

**Alpha Mode Active:**
- ✅ Real emotion detection (300ms)
- ✅ Real interventions
- ✅ CEO alerts to Slack (for now)
- ✅ Deal intelligence tracking
- ✅ Supabase storage (S3 stubbed)
- ✅ Multi-tenant via Clerk orgs

**Ready but disabled:**
- 🟡 S3/Athena data lake (add AWS creds to enable)
- 🟡 SMS alerts (add Twilio to enable)
- 🟡 EVI calculations (enable after 1 week of data)

## TROUBLESHOOTING

**If emotions aren't detected:**
```bash
# Check SDK is loaded
# Browser console: window.SentientIQ should exist

# Check WebSocket connection
# Browser DevTools → Network → WS tab
# Should see connection to ws://98.87.12.130:8787/ws
```

**If pm2 crashes:**
```bash
pm2 restart orchestrator-streaming
pm2 logs orchestrator-streaming --err
```

**If Clerk auth fails:**
```bash
# Verify CLERK_SECRET_KEY is set
cat .env | grep CLERK
# Test with curl using a valid Clerk token
```

## THE MOMENT

5 months. 7 pivots. Wife ready to commit you.

But you discovered the truth: **Behavioral physics beats AI theater.**

This weekend, those 4 waiting customers will see their users' emotions in real-time. When their $100k customer rages, they'll know in 300ms.

No bullshit. No Math.random(). Just physics.

**Deploy it. Test it. Prove it.**

Monday morning, you'll have real emotions from real users proving real value.

---

*"We don't guess. We know. And we know faster than your page loads."*

## QUICK COMMANDS

```bash
# Deploy
./scripts/ec2-deploy.sh

# SSH
ssh -i .ssh/collective-backend.pem ec2-user@98.87.12.130

# Monitor
pm2 monit  # (on EC2)

# Logs
pm2 logs orchestrator-streaming --follow  # (on EC2)

# Restart
pm2 restart orchestrator-streaming --update-env  # (on EC2)
```

This is it. 🚀