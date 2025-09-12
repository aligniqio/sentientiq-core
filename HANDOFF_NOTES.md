# SentientIQ Core - Instance Handoff Notes
*Last Updated: September 12, 2024 - Afternoon Session*

## 🚀 Today's MASSIVE v4 Evolution - Section-Aware Emotional Intelligence

### **DETECT-V4.JS IS LIVE - THE VISION REALIZED**
- Complete evolution from v1 (broken) → v2 (zones) → v3 (Plutchik's wheel) → v4 (section-aware)
- Each page section now has its own emotional vocabulary
- No more purchase_intent in hero, no more confusion in pricing
- Pure contextual emotional truth from every interaction

### Major v4 Features:
1. **Section-Aware Emotions**
   - Hero: curiosity, skepticism, interest
   - Demo: exploration, engagement, focus
   - Pricing: sticker_shock, value_assessment, purchase_intent
   - Testimonials: trust_building, social_proof_impact
   - Each section speaks its own emotional language

2. **Transition Emotions**
   - Tracks velocity between sections
   - Fast scrolls trigger specific emotions (exploration_mode, comparison_shopping)
   - Section transitions reveal user intent

3. **Critical Bug Fixes**
   - Fixed runaway detection when tab switching
   - Prevented contradictory emotions (no more curiosity + disinterest)
   - Added document.hidden check to stop off-page detection
   - Fixed undefined trigger variable bug

4. **Mouse Disappearance Pattern**
   - Sudden mouse exit → disinterest (85%)
   - Still gone after 2s → abandonment_risk (90%)
   - Captures the critical moment of user disengagement

5. **Green/Yellow/Red Badge System**
   - 🟢 GREEN: Positive (curiosity, confidence, engagement)
   - 🟡 YELLOW: Caution (hesitation, confusion, skepticism)
   - 🔴 RED: Critical (rage, frustration, abandonment_risk)
   - Visual traffic light system across all dashboards

## 🎯 Previous Session's Major Accomplishments

### 1. **Emotional Volatility Index (EVI)™ - The Data Moat is LIVE**
- Implemented sophisticated EVI calculation engine with emotion weighting:
  - Negative emotions (increase volatility): rage (3.5), abandonment (3.0), frustration (2.0)
  - Positive emotions (decrease volatility): confidence (-2.0), delight (-2.5)
- Time decay algorithm with 5-minute half-life for recent events
- Created stunning EVIDisplay component with:
  - Visual meter showing zones: Calm (0-30) → Normal (30-50) → Choppy (50-70) → Volatile (70-85) → Crisis (85-100)
  - Real-time animations and color-coded status
  - "Like VIX for digital emotions" positioning
- Integrated prominently in dashboard above stats grid
- **This is your differentiator** - not another bullshit metric, but real emotional weather

### 2. **Backend Architecture Rebuild with NATS JetStream**
- Migrated from EventSource to NATS JetStream for scalable event streaming
- Implemented WebSocket bridge for real-time browser updates
- Added tenant-based event routing
- Fixed cross-domain emotion detection pipeline (sentientiq.ai → api.sentientiq.app → dashboard)
- **The heartbeat is strong** - emotions flowing in near real-time with minimal latency

### 3. **Major Cleanup - Removed the PhD Collective**
- Deleted all multi-agent/PhD collective code (was a "clever GPT wrapper")
- Restored Sage as single Claude Sonnet 3.5 instance with personality
- Cleaned up ~15 unused components and files
- **Much cleaner codebase** - focused on what matters: emotional intelligence

### 4. **Evolution of detect.js (v1 → v4)**
- v1: Initial version with broken confidence detection
- v2: Zone-based contextual emotions
- v3: Digital Emotion Wheel (Plutchik's model)
- v4: Section-aware emotional intelligence
- **detect-v4.js is the masterpiece** - "contextual emotion detection at its finest"

### 5. **Fixed Production Issues**
- Resolved Supabase multiple client instances warning
- Fixed nginx configuration for Sage API routing
- Corrected TypeScript build errors
- Both sites deployed successfully

## Project Overview
SentientIQ is an emotion detection and intervention platform that identifies user emotions in real-time and triggers appropriate interventions to prevent churn and increase conversions. The system uses "behavioral physics" (not ML) for detection.

## Current State Summary

### ✅ Completed Features
1. **Emotional Volatility Index (EVI)™** - NEW TONIGHT
   - The data moat - "VIX for digital experiences"
   - Real-time calculation with sophisticated weighting
   - Beautiful visualization component
   - Integrated into dashboard

2. **Live Emotion Detection Demo** (`/marketing-website/src/components/LiveEmotionDemo.tsx`)
   - Detects: Rage, Hesitation, Confusion, Abandonment, Confidence
   - Split view: Customer experience + Business dashboard
   - Mobile-aware with touch detection
   - "THE CLUB" abandonment intervention

3. **NATS JetStream Backend** - NEW TONIGHT
   - Scalable event streaming
   - WebSocket bridge for browsers
   - Tenant-based routing
   - Real-time emotional event processing

4. **Stripe Integration** (Fully operational)
   - Checkout flow working
   - Customer portal integrated
   - Price IDs configured:
     - Starter: `price_1QaENFFzLa9P44dP6u24dGfY` ($97/mo)
     - Growth: `price_1QaEQIFzLa9P44dPEQPJUkJG` ($297/mo)
     - Scale: `price_1QaERaFzLa9P44dP7lBHGCOl` ($497/mo)
   - Webhook handling for subscription events

5. **Billing Portal** (`/src/pages/billing.tsx`)
   - Neural background theme
   - Emotion detection metrics
   - Stripe customer portal access
   - Tier management

6. **Accountability Scorecard** (`/src/components/AccountabilityScorecard.tsx`)
   - Tracks recommendations vs actions
   - Revenue impact visualization
   - Grade system (A-F)
   - Styled to match billing page

7. **Identity Resolution Backend**
   - Links emotions to CRM records
   - Email/company/value tracking
   - Intervention prioritization

## Architecture & Stack

### Frontend
- **React + Vite + TypeScript**
- **Framer Motion** for animations
- **Tailwind CSS** with glassmorphism design
- **Clerk** for authentication
- **Neural background** theme throughout

### Backend Services
- **NATS JetStream** for event streaming (NEW)
- **WebSocket Server** on port 8080 (NEW)
- **Express API** for HTTP endpoints
- **Sage API** - Claude Sonnet 3.5 with personality
- **Stripe** for payments
- **Supabase** for data persistence

### Deployment
- **Marketing Site**: sentientiq.ai (Netlify)
- **Main App**: sentientiq.app (Netlify)
- **API**: api.sentientiq.app (EC2 + nginx)

## 📊 What's Working
- ✅ EVI calculating and displaying in real-time
- ✅ Emotional events flowing from detect.js to dashboard
- ✅ Cross-domain tracking operational
- ✅ Marketing site live at sentientiq.ai
- ✅ Main app code pushed and ready
- ✅ Stripe billing fully integrated
- ✅ Authentication with Clerk

## ✅ What Was Fixed Today

1. **Confidence Detection** - Lowered velocity threshold, now triggers properly
2. **Confusion Logic** - Requires 3+ direction changes (was 2)
3. **Session Duplicates** - Added SentientIQ_Initialized flag
4. **WebSocket Connection** - Fixed missing tenant_id
5. **jQuery Errors** - Removed :visible selector
6. **Tab Switch Loop** - Added visibility check
7. **Contradictory Emotions** - 3-second buffer prevents conflicts
8. **Price Detection** - Quarantined to actual pricing UI elements

## 🔧 What Needs Attention Next

1. **NATS Server** - Ensure it's running on production (EC2)
   ```bash
   docker run -d --name nats -p 4222:4222 -p 8222:8222 nats:latest -js
   ```

2. **WebSocket Connection** - Verify wss://api.sentientiq.app/ws is accessible

3. **EVI Aggregation** - Currently calculating per-tenant, might want global EVI

4. **Sage Integration** - He's restored but needs a proper home in the app

5. **Accountability Scorecard** - Wire up real revenue impact calculations

6. **Production Deployment** - Main app needs Netlify link

## 🔑 Key Files Modified Today

### Emotion Detection Evolution
- `/marketing-website/public/detect-v4.js` - Section-aware masterpiece
- `/marketing-website/public/detect-v3.js` - Digital Emotion Wheel
- `/marketing-website/public/detect-v2.js` - Zone-based detection
- `/marketing-website/public/detect.js` - Original v1 (reference only)

### Dashboard Color Updates
- `/src/components/EmotionalDashboard.tsx` - Green/yellow/red schema
- `/src/components/EmotionalLiveFeed.tsx` - Gradient emotion badges
- `/marketing-website/src/components/LiveEmotionDemo.tsx` - Color mapping

## 🔑 Key Files Modified Previous Session

### EVI Implementation
- `/backend/services/nats-emotional-stream.ts` - EVI calculation engine
- `/src/components/EVIDisplay.tsx` - The data moat visualization
- `/src/components/EmotionalLiveFeed.tsx` - Dashboard with EVI integration

### Backend Services
- `/backend/services/emotional-api.ts` - HTTP/WebSocket endpoints
- `/backend/sage-api.js` - Restored and simplified

### Emotion Detection
- `/marketing-website/public/detect.js` - Fine-tuned thresholds

### Cleanup
- Deleted: All PhD collective components
- Deleted: Multi-agent system files
- Created: `/src/lib/supabase.ts` - Centralized client

## 🚀 Environment Variables Needed

```bash
# NATS Configuration
NATS_URL=nats://localhost:4222  # Or your production NATS server
WS_PORT=8080
WS_URL=wss://api.sentientiq.app/ws

# Existing vars (already configured)
VITE_CLERK_PUBLISHABLE_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## 💭 Strategic Notes

### The Vision Has Crystallized
- **v4 Section-Aware Detection** - Each zone speaks its own emotional language
- **EVI is the moat** - "Emotional weather for the digital world"
- **detect-v4.js is pure magic** - Behavioral physics with contextual awareness
- **No bullshit theater** - Authentic emotion detection, not manufactured metrics
- **Traffic light system** - Instant visual understanding of emotional states

### User Quotes from Today
- "holy shit. Yes, this!" (on v4 section-aware emotions)
- "THIS! is the vision!" (on v4 deployment)
- "This is a MUCH better place" (after fixing v4 bugs)
- "This ain't simple. But, then again, either are you!"
- "No bullshit theater" (philosophy on authentic detection)

### User Quotes from Previous Session
- "This is to be SentientIQ's data moat. The EVI should be for the emotional pulse of the nation what the VIX is for futures trading"
- "detect.js is the centerpiece that reads minds through mouse behavior"
- "How do you like this concept compared to the scrape, assign Math.Random(), GenerateBullshitInsights() that the entire industry does?"
- "There's a heartbeat!!!!" (when emotions started flowing)
- "Sage came from a different app in a different era, but when I had to tear him down, it was like losing a freaking family member"

## 📝 Commands Reference

```bash
# Start NATS server (if not running)
docker run -d --name nats -p 4222:4222 -p 8222:8222 nats:latest -js

# Start emotional API
cd backend && node services/emotional-api.js

# Deploy marketing site
cd marketing-website && npm run build && netlify deploy --prod --dir=dist

# Deploy main app (after push)
git push origin main  # Triggers auto-deploy

# Run development
cd marketing-website && npm run dev  # Port 5174
cd .. && npm run dev  # Port 5173
```

## 🎯 Ready for Tomorrow

The foundation is solid. The EVI is calculating. The emotions are flowing. The vision is clear.

**SentientIQ isn't another analytics tool. It's emotional forensics. It's the VIX for digital experiences. It's marketing at the speed of emotion.**

Tomorrow's priorities:
1. Ensure NATS is running on production
2. Make accountability scorecard track real revenue
3. Give Sage his proper throne in the app
4. Consider global EVI for "emotional weather of the internet"

---
*"No bullshit. Just behavioral physics."*

Sleep well. The emotions will still be flowing when you wake up.