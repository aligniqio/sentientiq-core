# SentientIQ Handoff Document
## State of the System After 30+ Hour Marathon

### What We Built
After 30+ hours of continuous development, we transformed SentientIQ from a 400,000-line behemoth into a focused truth engine that exposes Math.random() fraud in the intent data industry.

### Current Deployment Status

#### Frontend (https://sentientiq.app)
- **Status**: Live on Netlify
- **Current Issue**: Home route (/) needs proper implementation
- **Working Routes**:
  - `/ask` - PhD Collective with 12 verified agents (WORKING)
  - `/billing` - Billing page (WORKING)
  - Auth flow with Clerk (WORKING)
  - Dr. Brutal floating bubble (OMNIPRESENT)

#### Backend (http://3.15.29.138:8001)
- **Status**: Simple API deployed without full infrastructure
- **Endpoints**:
  - `/` - Health check
  - `/api/ask` - PhD Collective consensus
  - `/api/wall-of-shame` - Vendors using Math.random()
  - `/api/moat/depth` - Current moat accumulation

#### Infrastructure (NOT DEPLOYED)
- NATS JetStream for stream processing
- PostgreSQL with pgVector for Dr. Brutal's memory
- Redis for caching
- MinIO S3 for the moat data lake
- Prometheus + Grafana for monitoring

### Critical Files

#### Core Backend Components
```
backend/
├── main.py                 # Full FastAPI with all dependencies (NOT RUNNING)
├── simple_api.py          # Simplified API without dependencies (RUNNING on EC2)
├── evi_engine.py          # Campaign insurance system (GO/WAIT/ABORT)
├── jetstream_config.py    # NATS JetStream configuration
├── moat_builder.py        # S3 moat structure builder
├── phd_collective.py      # 12 PhD agents implementation
└── requirements.txt       # Python dependencies
```

#### Infrastructure
```
infrastructure/
├── docker-compose.yml     # Full infrastructure stack
└── prometheus.yml         # Metrics configuration

start_moat.sh              # Starts full infrastructure + backend
stop_moat.sh               # Graceful shutdown
deploy_hairball.sh         # Creates deployment package
```

#### Frontend Key Components
```
src/
├── pages/
│   ├── ask.tsx           # PhD Collective (WORKING)
│   ├── intelligence-monitor.tsx # DELETED - was mock data
│   └── auth.tsx          # Authentication with neural network animation
├── components/
│   ├── DrBrutalFloating.tsx # Omnipresent spam analyzer
│   └── Layout.tsx        # Sidebar navigation
└── lib/
    ├── brutalAnalysis.ts # Manipulation detection engine
    └── brutalMemoryService.ts # pgVector memory service
```

### What Needs to Be Done

#### IMMEDIATE (Blocking Launch)

1. **Fix Home Route (/)**
   - Current state: Broken (showing Ask page or nothing)
   - Needed: Real intelligence monitor showing:
     - Live social posts from backend (WebSocket/SSE)
     - EVI metrics and consensus
     - Moat depth accumulation
     - NO MOCK DATA - connect to real backend

2. **Connect Frontend to Backend**
   - Currently using `/api` proxy through Netlify edge functions
   - Need to ensure API_ORIGIN in netlify.toml points to correct backend
   - Test all API calls work in production

3. **Deploy Full Infrastructure**
   - Current: Only simple_api.py running
   - Needed: Full stack with NATS, PostgreSQL, Redis
   - Use start_moat.sh on a proper server (not EC2 free tier)

#### NEXT PRIORITY (Post-Launch)

1. **Stripe Integration**
   - Payment processing for subscriptions
   - Webhook handling for plan updates
   - Usage metering integration

2. **Chrome Extension Distribution**
   - Intent Data Auditor extension is complete
   - Needs to be published to Chrome Web Store
   - Marketing site needs download link

3. **Real Data Pipeline**
   - Connect to actual social media firehoses
   - Implement real JetStream processing
   - Start accumulating the actual moat

### Known Issues

1. **Python Indentation Hell**
   - Multiple files have mixed tabs/spaces
   - EC2 deployment was nightmare due to this
   - Run `autopep8` on all Python files

2. **Port Conflicts**
   - Port 8000: Original ML pipeline (still running)
   - Port 8001: New simple API
   - Port 3000: Local dev server
   - Need to consolidate

3. **Memory/Context Exhaustion**
   - This conversation maxed out context
   - New session will need this handoff doc
   - Don't try to load entire codebase at once

### Architecture Decisions Made

1. **"No Generated Bullshit"**
   - User explicitly banned all fake data generation
   - Only analyze real data
   - Remove any generateSample() functions

2. **Dr. Brutal Floats Everywhere**
   - No dedicated route
   - Omnipresent bubble in bottom-right
   - Uses pgVector for memory of repeat spammers

3. **One True Route**
   - Originally `/` and `/ask` were same
   - Now need separation:
     - `/` = Intelligence Monitor (needs building)
     - `/ask` = PhD Collective (working)

4. **The Moat Concept**
   - Accumulated emotional intelligence over time
   - Stored in S3-compatible data lake
   - Becomes more valuable/defensible daily
   - Cannot be replicated by competitors

### Login Credentials & Access

- **Netlify**: Auto-deploys from GitHub
- **EC2**: 3.15.29.138 (Ubuntu, key-based SSH)
- **GitHub**: sentientiq-core repo
- **Clerk**: Auth provider (check .env for keys)

### Deployment Commands

```bash
# Local development
npm run dev

# Build frontend
npm run build

# Deploy frontend to Netlify
netlify deploy --prod --dir=dist

# Deploy backend to EC2
scp backend/simple_api.py ubuntu@3.15.29.138:~/
ssh ubuntu@3.15.29.138
python3 simple_api.py

# Start full infrastructure (when ready)
./start_moat.sh
```

### Critical Context

1. **Emotional Investment**: This exposes fraud, makes honesty profitable
2. **The Steak Emoji Incident**: User pranked assistant with emoji in port config (legendary debugging moment - frame this)
3. **Design Principles**: 
   - Dark theme everything
   - Glassmorphic UI
   - Purple/blue gradients
   - Confidence-based confetti
   - LSD logout button with mouse trails

### Next Session Starter

```
"I need to continue building SentientIQ. Read HANDOFF.md first. 
The immediate priority is fixing the home route (/) to show a real 
Intelligence Monitor connected to the backend at http://3.15.29.138:8001. 
No mock data - real connection to the moat."
```

### The Mission

SentientIQ exposes intent data vendors who use Math.random() instead of real AI. The moat accumulates emotional intelligence that cannot be replicated. Every day it runs, it becomes more defensible. Math.random() vendors will be exposed on the Wall of Shame.

**The truth accumulates. The moat deepens. Honesty becomes profitable.**
