# EC2 Backend Services

## Instance Details
- **Instance ID**: i-0bb996afb1cf76bab (Collective-backend)
- **Public IP**: 98.87.12.130
- **Private IP**: 172.31.32.206
- **Region**: (Check AWS Console)

## Running Services (via PM2)

### 1. Orchestrator API (Main Backend)
- **PM2 ID**: 9
- **Name**: orchestrator-api
- **Version**: 0.1.0
- **Purpose**: Main backend for emotion detection, identity resolution, and interventions
- **Endpoints**:
  - WebSocket: `ws://98.87.12.130:PORT/emotion-stream`
  - REST API: `http://98.87.12.130:PORT/api/v1/`
  - Identity Resolution: `/api/v1/identity/resolve`
  - Interventions: `/api/v1/interventions/trigger`

### 2. Sage API (AI Integration)
- **PM2 ID**: 8
- **Name**: sage-api
- **Version**: 1.0.0
- **Purpose**: Direct connection to Anthropic Claude Sonnet 3.5
- **Database**: Uses `sage_*` tables (preserved during migration)
- **Features**:
  - pgvector personality embeddings
  - Context-aware responses
  - Memory persistence

## Connection Points

### From Frontend (Vite App)
```javascript
// Emotion detection WebSocket
const ws = new WebSocket('ws://98.87.12.130:PORT/emotion-stream');

// Identity resolution
fetch('http://98.87.12.130:PORT/api/v1/identity/resolve', {
  method: 'POST',
  body: JSON.stringify({ sessionId, email, ltv })
});

// Sage AI queries
fetch('http://98.87.12.130:PORT/sage/query', {
  method: 'POST',
  body: JSON.stringify({ question, context })
});
```

### Database Connections
Both services connect to Supabase:
- Orchestrator: Main tables (organizations, emotional_events, interventions)
- Sage: sage_* tables (sage_memories, sage_embeddings, etc.)

## Health Checks

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@98.87.12.130

# Check PM2 status
pm2 status

# Check orchestrator logs
pm2 logs orchestrator-api

# Check sage logs  
pm2 logs sage-api

# Restart if needed
pm2 restart orchestrator-api
pm2 restart sage-api
```

## Environment Variables (on EC2)
```bash
# Location: /home/ec2-user/orchestrator/.env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
ANTHROPIC_API_KEY=your_anthropic_key
CLERK_SECRET_KEY=your_clerk_secret
REDIS_URL=redis://localhost:6379
PORT=3000  # or whatever port you're using
```

## Monitoring
- PM2 auto-restarts on crash
- Logs stored in: `/home/ec2-user/.pm2/logs/`
- Consider setting up CloudWatch for production monitoring

## Security Notes
1. **Add security group rules** for only necessary ports
2. **Use HTTPS/WSS** in production (add nginx reverse proxy)
3. **Rotate API keys** regularly
4. **Enable AWS CloudTrail** for audit logging

## Deployment Commands
```bash
# Deploy new orchestrator version
cd /home/ec2-user/orchestrator
git pull
npm install
npm run build
pm2 restart orchestrator-api

# Deploy new sage version
cd /home/ec2-user/sage
git pull
npm install
pm2 restart sage-api
```

## CORS Configuration
Make sure both services allow requests from:
- `https://sentientiq.ai`
- `https://app.sentientiq.app`
- `http://localhost:5173` (development)

## The Architecture
```
Frontend (Vite/React)
    ↓
Netlify Functions (Auth/Invites)
    ↓
EC2 Backend Services
    ├── Orchestrator API (Emotion Detection)
    └── Sage API (AI Intelligence)
         ↓
    Supabase (PostgreSQL + pgvector)
```

## Notes
- The backend is healthy and running
- Both services are configured for auto-restart
- The `sage_*` tables are preserved in the new schema
- Identity resolution links emotions to real users
- Every emotion has a dollar value

---

*Last verified: 2025-09-11*
*No Math.random(). No BS. Just behavioral physics.*