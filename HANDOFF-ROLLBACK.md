# Emergency Rollback Handoff - WebSocket Refactoring Disaster

## Date: September 17, 2025
## Duration: ~4.5 hours
## Result: ROLLED BACK to commit `ad975206`

## What We Tried to Fix
- WebSocket connection errors on /pulse page
- "telemetry → behavior" events contaminating the intervention stream
- Monolithic EmotionalLiveFeed component (1200+ lines) doing too many things

## What Actually Happened

### Hour 1-3.5: WebSocket Debugging
- Fixed tenant_id issues (was hardcoded to 'demo', changed to use actual user.id)
- Added missing Supabase keys to EC2 orchestrator
- Multiple restart cycles of orchestrator-clean service
- WebSocket errors persisted despite fixes

### Hour 3.5-4: Component Refactoring
**The Plan:** Split monolithic EmotionalLiveFeed into 3 focused components:
1. `IntelligenceFlowArchitecture.tsx` - Pipeline metrics and flow visualization
2. `LiveEmotionalFeed.tsx` - Real-time emotional events with EVI display
3. `ActiveInterventions.tsx` - Intervention tracking and intelligence stream

**What Went Wrong:**
1. Successfully created the three components
2. Updated `/pulse/index.tsx` to use all three
3. Built and deployed... to EC2 (backend) instead of Netlify (frontend) 🤦
4. Spent 30 minutes debugging why changes weren't showing
5. Finally deployed to Netlify
6. Components weren't rendering - discovered App.tsx was still routing directly to `EmotionalLiveFeed` instead of `PulseDashboard`
7. Fixed routing, but then only LiveEmotionalFeed showed (2 components missing)
8. Changed grid layout from 2-column to vertical stack
9. Accidentally committed 80,000 lines of node_modules/.vite cache
10. After all fixes, ended up with DUPLICATE components and NEW errors (429s, Clerk errors)

## Current State (After Rollback)
- **Commit:** `ad975206 - Fix WebSocket connection and telemetry contamination issues`
- **Components:** Original monolithic EmotionalLiveFeed (working but not ideal)
- **WebSocket:** Original implementation with some fixes
- **Deployment:** Clean build deployed to Netlify

## Key Learnings

### What Was Actually Wrong
1. **Wrong Deployment Target:** Frontend goes to Netlify, not EC2
2. **Routing Issue:** App.tsx was bypassing PulseDashboard component
3. **Import/Build Issue:** New components weren't being included in build properly

### Architecture Clarity
- **EC2 (98.87.12.130):** Backend orchestrator API, WebSocket server
- **Netlify:** Frontend React app hosting
- **Supabase:** Database and auth
- **Clerk:** User authentication

### The Refactored Components (Still in Git History)
If you want to try again, the three components are at commits:
- `6f4d1e52` - Has all three refactored components
- They're clean, well-separated, and should work
- Main issue was routing and deployment, not the components themselves

## Recommended Next Steps

### Option 1: Stay with Current (Safe)
- Monolithic component works, even if not ideal
- Focus on fixing actual WebSocket issues server-side
- Leave refactoring for another day

### Option 2: Retry Refactoring (Risky)
If you want to try the refactoring again:
1. Cherry-pick the component files from `6f4d1e52`
2. **IMPORTANT:** Update `App.tsx` to use `PulseDashboard` at `/pulse` route
3. Ensure all three components are imported in pulse/index.tsx
4. Build locally and verify all components render
5. Deploy to **Netlify**, not EC2
6. Test thoroughly before celebrating

## WebSocket Configuration
Current WebSocket URLs should be:
- Emotions: `wss://api.sentientiq.app/ws?channel=emotions&tenant_id={user.id}`
- Interventions: `wss://api.sentientiq.app/ws?channel=interventions&tenant_id={user.id}`

**Critical:** Use actual Clerk user.id, not 'demo' or organization_id (which might be null)

## Files That Matter
- `/src/product/App.tsx` - Main routing (THIS IS CRITICAL)
- `/src/pages/pulse/index.tsx` - Pulse dashboard page (if using refactored approach)
- `/src/components/EmotionalLiveFeed.tsx` - Current monolithic component
- `/orchestrator/src/server-clean.js` - Backend WebSocket server
- `/orchestrator/src/services/unified-websocket.ts` - WebSocket broadcast logic

## Environment Variables
All should be in:
- Backend: `/backend/.env`
- Orchestrator on EC2: `/home/ec2-user/orchestrator/.env`
- Netlify: Dashboard environment variables

## What NOT to Do
1. Don't deploy frontend to EC2
2. Don't commit node_modules or .vite folders
3. Don't change tenant_id logic without understanding user structure
4. Don't refactor without verifying the routing chain first

## Final Note
The refactoring itself was solid. The components were clean and well-separated. The disaster came from deployment confusion, routing issues, and cascade failures. If attempting again, focus on the deployment pipeline and routing FIRST, then refactor.

Time spent: 4.5 hours
Result: Rolled back to working state
Lesson: Sometimes the cure is worse than the disease