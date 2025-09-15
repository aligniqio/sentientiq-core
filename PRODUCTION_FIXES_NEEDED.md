# Production Fixes Applied Directly to EC2
## WARNING: These changes need to be applied to local code

### Critical Fixes Applied on EC2 (September 14, 2025)

These changes were made directly on the EC2 instance to fix production issues.
They MUST be applied to the local codebase to prevent losing them on next deployment.

---

## 1. Timestamp Conversion Fix
**File**: `/home/ec2-user/orchestrator/dist/services/emotional-analytics.js`
**Line**: 29
**Change**: Handle both string and Date timestamps
```javascript
// OLD:
timestamp: event.timestamp.toISOString()

// NEW:
timestamp: typeof event.timestamp === "string" ? event.timestamp : new Date(event.timestamp).toISOString()
```

---

## 2. Trust Proxy Setting
**File**: `/home/ec2-user/orchestrator/dist/server.js`
**Location**: After `const app = express();`
**Change**: Add trust proxy for proper IP handling behind nginx
```javascript
app.set("trust proxy", true);
```

---

## 3. Supabase Environment Variable
**File**: `/home/ec2-user/orchestrator/.env`
**Change**: Added missing environment variable
```bash
# The code expects SUPABASE_SERVICE_ROLE_KEY but .env had SUPABASE_SERVICE_KEY
SUPABASE_SERVICE_ROLE_KEY=<same value as SUPABASE_SERVICE_KEY>
```

---

## 4. Rate Limit Adjustments
**File**: `/home/ec2-user/orchestrator/dist/middleware/security.js`
**Changes**: Increased limits to prevent blocking legitimate traffic
```javascript
// General API limiter
max: 500, // was 100

// Emotion events limiter
max: 600, // was 120
```

---

## 5. WebSocket Info Endpoint
**File**: `/home/ec2-user/orchestrator/dist/server.js`
**Location**: After the emotional analytics routes
**Change**: Added missing endpoint for dashboard
```javascript
app.get("/api/emotional/ws-info", (req, res) => {
    res.json({
        ws_url: "wss://api.sentientiq.app/ws/emotions",
        protocol: "wss",
        path: "/ws/emotions",
        status: "available"
    });
});
```

---

## 6. WebSocket Server Initialization
**File**: `/home/ec2-user/orchestrator/dist/server.js`
**Changes**:
1. Import WebSocket handler at top:
```javascript
import { setupWebSocket } from "./websocket-handler.js";
```

2. Store server instance and setup WebSocket:
```javascript
// OLD:
app.listen(PORT, () => {

// NEW:
const server = app.listen(PORT, () => {
    console.log(`orchestrator listening on :${PORT}`);
    // ... other logs
});

// Set up WebSocket server
setupWebSocket(server);
```

---

## 7. Nginx Configuration Fix
**File**: `/etc/nginx/conf.d/api.conf`
**Change**: Fixed WebSocket proxy port
```nginx
# /ws endpoint was pointing to wrong port
location /ws {
    proxy_pass http://localhost:8787;  # was 8080
    # ... rest of config
}
```

---

## Required Actions:

1. **Apply all fixes to local orchestrator source code** (TypeScript files in `/orchestrator/src/`)
2. **Build the orchestrator locally** (`npm run build` in orchestrator directory)
3. **Test locally** to ensure everything works
4. **Commit changes to Git** for version control
5. **Deploy properly** using a deployment script that:
   - Builds locally
   - Copies built files to EC2
   - Restarts PM2 processes
   - Maintains environment variables

## Deployment Script Suggestion:

Create a `deploy.sh` script:
```bash
#!/bin/bash
# Build locally
cd orchestrator
npm run build

# Copy to EC2
scp -r dist/* ec2-user@98.87.12.130:/home/ec2-user/orchestrator/dist/

# Restart on EC2
ssh ec2-user@98.87.12.130 "pm2 restart orchestrator-emotion"
```

## Current Status:
- WebSocket is working on production
- Dashboard can connect
- Events are flowing
- But all changes are ONLY on EC2 and will be lost on next deployment!