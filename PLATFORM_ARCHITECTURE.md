# SentientIQ Platform Architecture

## Executive Summary
SentientIQ is an Emotional Revenue Generation platform that detects user emotions in real-time through behavioral physics, identifies WHO is experiencing WHAT emotion, and prescribes immediate interventions to protect revenue.

## Core Components

### 1. Detection Layer (detect.js)
**Purpose**: Client-side behavioral physics engine
```javascript
// Core capabilities
- Rage detection: 300ms response time
- Hesitation patterns: Mouse velocity analysis
- Confusion mapping: Scroll chaos detection
- Delight signals: Engagement velocity
- Abandonment prediction: Exit intent + emotional state
```

**Key Features**:
- Zero dependencies (pure vanilla JS)
- 15KB minified
- Identity resolution via `SentientIQ.identify()`
- Automatic API batching
- Privacy-first (no PII in detection)

### 2. Identity Resolution Layer
**Purpose**: Connect emotions to specific users
```typescript
interface UserIdentity {
  userId: string
  email?: string
  company?: string
  tier?: 'enterprise' | 'growth' | 'starter'
  value?: number // LTV/ARR
  traits?: Record<string, any>
}
```

**Integration Points**:
- Segment.io piggyback
- Amplitude enrichment
- HubSpot/Salesforce sync
- Custom webhook support

### 3. Processing Pipeline (orchestrator)
**Purpose**: Real-time event processing and intervention
```typescript
// Event flow
1. Ingestion API (/api/emotional-events)
2. Pattern Recognition Engine
3. Intervention Decision Tree
4. Action Dispatcher
```

**Core Services**:
- `emotional-analytics.ts`: Event processing
- `intervention-engine.ts`: Decision logic
- `notification-service.ts`: Alert dispatch
- `crm-sync.ts`: CRM updates

### 4. Intervention System
**Purpose**: Automated response to emotional states

```yaml
Triggers:
  - VIP Rage: 
      - Slack alert to account owner
      - Live chat auto-engagement
      - Support ticket creation
  
  - Enterprise Confusion:
      - In-app guidance activation
      - Proactive email with resources
      - Calendar link for demo
  
  - Champion Delight:
      - Upsell modal presentation
      - Account manager notification
      - NPS survey trigger
```

### 5. Data Storage (Supabase)
**Schema**:
```sql
-- Core tables
emotional_events (
  id uuid PRIMARY KEY,
  user_id text,
  email text,
  company text,
  emotion_type text,
  confidence float,
  url text,
  timestamp timestamptz,
  intervention_triggered boolean
)

interventions (
  id uuid PRIMARY KEY,
  event_id uuid REFERENCES emotional_events,
  type text, -- 'slack', 'email', 'chat', 'crm'
  status text, -- 'pending', 'sent', 'acknowledged'
  outcome text,
  revenue_impact decimal
)

accountability_scores (
  company_id text PRIMARY KEY,
  total_recommendations int,
  actions_taken int,
  revenue_saved decimal,
  revenue_lost decimal,
  score int -- 0-100
)
```

### 6. Dashboard & Analytics (sentientiq.app)
**Key Views**:
1. **Real-time Emotion Stream**: Live feed of all emotional events
2. **Identity Dashboard**: WHO is feeling WHAT
3. **Intervention Center**: Manage automated responses
4. **Accountability Scorecard**: Track recommendation compliance
5. **Revenue Attribution**: Connect emotions to revenue impact

### 7. Integration Layer

**Webhooks**:
```typescript
// Outbound webhooks for every emotion
POST /webhook/customer
{
  userId: "john@fortune500.com",
  emotion: "rage",
  confidence: 95.2,
  url: "https://app.com/checkout",
  recommendedAction: "immediate_intervention"
}
```

**API Endpoints**:
```typescript
// Public API
GET  /api/emotions/:userId     // Get user's emotional history
POST /api/interventions        // Trigger custom intervention
GET  /api/scorecard/:companyId // Accountability metrics
POST /api/identify              // Update user identity
```

**CRM Integrations**:
- Salesforce: Custom object for emotional events
- HubSpot: Timeline events + properties
- Intercom: User tags + events
- Slack: Real-time notifications

## Technical Stack

### Frontend (Dashboard)
- React 18 + TypeScript
- Tailwind CSS (glassmorphism design)
- Recharts for visualizations
- WebSocket for real-time updates
- Framer Motion for animations

### Backend (API/Processing)
- Node.js + Express/Fastify
- TypeScript
- Supabase (PostgreSQL + Realtime)
- Redis for caching/queues
- WebSocket server

### Infrastructure
- AWS EC2 for orchestrator
- Netlify for marketing site
- Supabase cloud for database
- CloudFlare for CDN/security
- SendGrid for email interventions

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│            CloudFlare CDN                   │
└─────────────┬───────────────┬───────────────┘
              │               │
     ┌────────▼─────┐  ┌──────▼──────┐
     │ sentientiq.ai│  │sentientiq.app│
     │  (Marketing) │  │  (Dashboard) │
     └──────────────┘  └──────┬───────┘
                              │
                    ┌─────────▼──────────┐
                    │   Orchestrator API  │
                    │    (AWS EC2)        │
                    └─────────┬──────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼──────┐ ┌───▼────┐ ┌──────▼─────┐
        │   Supabase   │ │ Redis  │ │ Webhooks   │
        │   Database   │ │ Queue  │ │ (External) │
        └──────────────┘ └────────┘ └────────────┘
```

## Key Differentiators

1. **Behavioral Physics vs Probabilities**
   - Deterministic detection, not statistical guessing
   - Actual micro-behavior analysis, not click tracking

2. **Identity-Aware Emotions**
   - Know WHO is experiencing emotions, not anonymous events
   - Connect emotions to customer value (LTV/ARR)

3. **Automatic Interventions**
   - Don't just detect, actively prevent revenue loss
   - Prescribed actions, not just dashboards

4. **Accountability System**
   - Track every recommendation given
   - Measure revenue impact of ignored interventions
   - Scorecard shows exactly what inaction costs

## Implementation Phases

### Phase 1: Core Detection (Completed ✓)
- detect.js behavioral engine
- Basic emotion detection
- API ingestion

### Phase 2: Identity Resolution (Current)
- User identification system
- CRM field mapping
- Enrichment pipeline

### Phase 3: Intervention Engine
- Decision tree logic
- Automated responses
- Multi-channel dispatch

### Phase 4: Revenue Attribution
- Connect emotions to outcomes
- Track intervention success
- ROI calculator

### Phase 5: ML Enhancement
- Pattern learning from outcomes
- Predictive intervention timing
- Custom emotion models per account

## Security & Privacy

- **No PII in detection layer**: Only behavioral signals
- **Encrypted transmission**: All API calls over HTTPS
- **GDPR compliant**: User consent + data deletion
- **SOC2 ready**: Audit logs, encryption at rest
- **Role-based access**: Enterprise SSO support

## Pricing Tiers Mapping

**Starter ($497/mo)**:
- 10,000 events/month
- Basic interventions (email, Slack)
- Weekly scorecard

**Growth ($1,997/mo)**:
- 100,000 events/month
- CRM integrations
- A/B testing interventions

**Scale ($4,997/mo)**:
- Unlimited events
- Custom ML models
- API access
- Multi-domain

**Enterprise (Custom)**:
- On-premise option
- Custom interventions
- White-label capability
- Dedicated support

## Success Metrics

1. **Technical KPIs**:
   - Detection latency < 300ms
   - API uptime > 99.9%
   - Intervention delivery < 5s

2. **Business KPIs**:
   - Revenue saved per intervention
   - Reduction in churn rate
   - Increase in upsell conversion
   - Accountability score improvement

## Next Steps

1. **Immediate** (Week 1):
   - Complete intervention engine
   - Add Salesforce integration
   - Deploy webhook system

2. **Short-term** (Month 1):
   - Launch CRM sync for HubSpot
   - Build revenue attribution dashboard
   - Create API documentation

3. **Medium-term** (Quarter 1):
   - ML model training pipeline
   - Enterprise SSO support
   - Advanced segmentation

4. **Long-term** (Year 1):
   - Predictive intervention AI
   - Industry-specific models
   - Global CDN deployment

---

*This is the architecture for replacing the $1.3B ABM industry with actual behavioral science.*