# SentientIQ Core - Instance Handoff Notes
*Last Updated: 2025-09-11*

## Project Overview
SentientIQ is an emotion detection and intervention platform that identifies user emotions in real-time and triggers appropriate interventions to prevent churn and increase conversions. The system uses "behavioral physics" (not ML) for detection.

## Current State Summary

### ✅ Completed Features
1. **Live Emotion Detection Demo** (`/marketing-website/src/components/LiveEmotionDemo.tsx`)
   - Detects: Rage, Hesitation, Confusion, Abandonment
   - Split view: Customer experience + Business dashboard
   - Mobile-aware with touch detection
   - "THE CLUB" abandonment intervention

2. **Stripe Integration** (Fully operational)
   - Checkout flow working
   - Customer portal integrated
   - Price IDs configured:
     - Starter: `price_1QaENFFzLa9P44dP6u24dGfY` ($97/mo)
     - Growth: `price_1QaEQIFzLa9P44dPEQPJUkJG` ($297/mo)
     - Scale: `price_1QaERaFzLa9P44dP7lBHGCOl` ($497/mo)
   - Webhook handling for subscription events

3. **Billing Portal** (`/src/pages/billing.tsx`)
   - Neural background theme
   - Emotion detection metrics
   - Stripe customer portal access
   - Tier management

4. **Accountability Scorecard** (`/src/components/AccountabilityScorecard.tsx`)
   - Tracks recommendations vs actions
   - Revenue impact visualization
   - Grade system (A-F)
   - Styled to match billing page

5. **Identity Resolution Backend**
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

### Backend
- **Netlify Functions** (serverless)
- **Supabase** for database
- **Stripe** for payments
- **Resend** for emails
- **Express billing API** (`backend/billing-api.js`)

### Key Files Structure
```
/marketing-website/        # Marketing site (sentientiq.ai)
  src/components/
    LiveEmotionDemo.tsx   # Core demo component
    EmotionalTrails.tsx   # Mouse trail effects
  netlify/functions/
    stripe-webhook.js     # Stripe → Clerk provisioning

/src/                     # Main app (app.sentientiq.com)
  pages/
    billing.tsx          # Billing portal
  components/
    AccountabilityScorecard.tsx
  hooks/
    useSubscription.ts   # Subscription state
  lib/
    billing.ts          # Tier definitions

/backend/
  billing-api.js        # Express API for billing
```

## Environment Variables Required

### Netlify (Production)
```
VITE_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
VITE_STRIPE_PUBLISHABLE_KEY
SUPABASE_URL
SUPABASE_SERVICE_KEY
```

### Local Development
Same as above, plus:
```
VITE_API_URL=http://localhost:3001
VITE_BILLING_API_URL=http://localhost:3003
```

## Current Issues & Considerations

### Known Limitations
1. **Chrome AudioContext** - Requires user interaction first
2. **Mobile Demo** - Different UX for touch devices
3. **Free Trial** - Removed per user request ("No free trial offered")

### Design Philosophy
- "Turn limitations into feature showcases"
- "The greatest marketing hook in history" - the live demo
- Professional tone, no profanity ("enterprise readiness")
- Neural/brain imagery throughout

## Next Development Areas

### Potential Improvements
1. **Real Emotion Data Pipeline**
   - Currently using demo data
   - Need to connect actual emotion events to database
   - Real-time WebSocket integration

2. **CRM Integrations**
   - Salesforce connector
   - HubSpot integration
   - Webhook system for third-party apps

3. **Analytics Dashboard**
   - Real emotion detection graphs
   - ROI calculator
   - A/B testing for interventions

4. **Enterprise Features**
   - Multi-tenant support
   - SSO/SAML
   - Custom intervention templates
   - White-label options

## Important Context

### User Preferences
- **No free trials** - Direct to paid only
- **Professional messaging** - Enterprise-ready
- **Visual impact** - "Neural Cathedral" aesthetic
- **Speed matters** - "Warp speed" development

### Marketing Positioning
- Targets intent data/ABM platforms
- "Every emotion has a dollar value"
- "The Accountability Loop"
- Identity resolution as key differentiator

### Technical Decisions
- Client-side emotion detection for scalability
- Behavioral physics over ML
- Glassmorphism UI with purple/blue gradients
- Split-view demo showing both perspectives

## Git History Highlights
- `e94c13a5` - Removed profanity for enterprise
- `7e846c3a` - Professional F2000 messaging
- `79dfba02` - EmoRevGen™ Category Creator
- Recent: Stripe integration + billing portal

## Development Commands
```bash
# Main app
npm run dev        # Start dev server
npm run build      # Build for production

# Marketing site
cd marketing-website
npm run dev

# Billing API
cd backend
node billing-api.js
```

## Testing Checklist
- [ ] Live demo works on desktop
- [ ] Mobile fallback displays correctly
- [ ] Stripe checkout completes
- [ ] Billing portal accessible
- [ ] Scorecard loads with demo data
- [ ] Build succeeds without TypeScript errors

## Contact & Resources
- Production: https://sentientiq.ai
- App: https://app.sentientiq.app
- GitHub: https://github.com/aligniqio/sentientiq-core
- Billing issues: billing@sentientiq.ai

## Final Notes
This project is in active development with a focus on enterprise readiness and professional presentation. The core emotion detection demo is the centerpiece - protect and enhance it. The user values speed, precision, and visual impact. Keep the "Neural Cathedral" aesthetic consistent across all new features.

Remember: "Every recommendation. Every action. Every dollar saved or lost."