# SentientIQ Product Specification
## "YOUR CUSTOMERS ARE SCREAMING. YOU JUST CAN'T HEAR THEM."

### Core Value Proposition
We detect WHO is feeling WHAT through behavioral physics. Not anonymous sessions - identified users with real names, companies, and lifetime values. When john@fortune500.com shows rage at checkout, you know instantly and intervene automatically.

### The Revolutionary Demo
**Location**: `/marketing-website/src/components/LiveEmotionDemo.tsx`

#### What It Does
1. **Detects emotions in real-time** (16ms response)
2. **Fires interventions in-browser** (chat, discounts, warnings)
3. **Shows split view**: Customer experience + Business dashboard
4. **Delivers THE CLUB**: "Your competitors use SentientIQ. They see YOU."

#### Desktop Detection
- **Rage**: 3+ clicks with <400ms intervals
- **Hesitation**: Hover duration >1.2s on elements
- **Confusion**: Scroll direction reversals
- **Abandonment**: Mouse trajectory toward exit
- **Searching**: Scroll velocity >10x normal
- **Confidence**: Single decisive clicks

#### Mobile Detection (Different, Not Lesser)
- **Frustration**: Rapid taps (<500ms intervals)
- **Searching**: Swipe velocity patterns
- **Confusion**: Pinch/zoom gestures
- **Abandonment**: App switch detection
- **Long press**: Hesitation equivalent

### The Message Hierarchy

#### Level 1: The Hook
"YOUR CUSTOMERS ARE SCREAMING. YOU JUST CAN'T HEAR THEM."

#### Level 2: The Promise
"Your $100k customer just felt rage. You have 3 seconds to save them."

#### Level 3: The Differentiator
"We don't track anonymous sessions. We identify WHO is feeling WHAT."

#### Level 4: The Business Truth
"EVERY EMOTION HAS A PRICE TAG"
- RAGE: -$2,400/mo
- HESITATION: -$1,200/mo
- CONFIDENCE: +$3,600/mo

#### Level 5: The Fear
"Your competitors use SentientIQ. They know when YOU visit their site."

### Technical Architecture

#### Frontend (Marketing Site)
- **Framework**: React + Vite + TypeScript
- **Animation**: Framer Motion
- **Styling**: Tailwind + Glassmorphism
- **Detection**: 100% client-side (infinite scalability)
- **Bundle**: 377KB production build

#### Emotion Detection Engine
- **Behavioral Physics**: Deterministic patterns, not ML probabilities
- **Multi-signal**: Clicks, hovers, scrolls, velocity, trajectory
- **Platform-aware**: Different detection for desktop/mobile
- **Rate-limited**: 15 events/minute max per session

#### Identity Resolution
- **Source**: YOUR app provides identity via SDK
- **Enrichment**: Link to CRM, calculate LTV
- **Format**: `SentientIQ.identify({ userId, email, value })`
- **Result**: Every emotion has a name and price

#### Intervention System
- **Types**: Chat, discount, guide, support, upsell, final warning
- **Triggers**: High-confidence emotions (>75%)
- **Timing**: 300ms delay for user to see emotion first
- **Priority**: Value-based (enterprise rage > starter confusion)

### Business Model

#### Pricing Strategy
- **NO FREE TRIALS** - Enterprise software that sells
- **Direct sales only** - Get Started → mailto:info@sentientiq.ai
- **Value-based pricing** - They see the ROI in the demo

#### Target Market
- **Primary**: B2B SaaS with $10k+ ACV customers
- **Secondary**: E-commerce with high cart values
- **Sweet spot**: Companies losing 5%+ to preventable churn

#### Sales Process
1. They experience the demo (emotions detected on THEM)
2. They see interventions fire (chat pops up, discounts appear)
3. They realize competitors can see them too (THE FEAR)
4. They contact sales (no free trial dance)
5. Enterprise contract signed

### Competitive Advantages

#### What We DON'T Do
- No probabilistic guessing
- No anonymous sessions
- No cookie matching
- No IP geolocation
- No delayed batch processing
- No free trials

#### What We DO
- Behavioral physics (deterministic)
- Identity resolution (100% accurate)
- Real-time intervention (<300ms)
- Value-based prioritization
- Full accountability tracking
- Direct enterprise sales

### Success Metrics

#### Demo Effectiveness
- Time to first emotion: <5 seconds
- Emotions per session: 3-7
- Intervention visibility: 100%
- "Holy shit" moment: When they see their session ID

#### Business Impact
- Demo → Contact rate: Target 15%
- Contact → Deal: Target 30%
- ACV: Target $50k+
- Sales cycle: Target <30 days

### The Unfair Advantage
**We show them the mirror**. They don't just see what we can do - they experience it happening to them. Then we show them their competitors have this power. The fear of being exposed drives faster sales than any feature list.

### Remember
- **No free trials** - Value sells itself
- **No apologies** - Mobile is different, not broken
- **No BS** - Behavioral physics, not ML wrapper
- **No anonymous** - We know WHO
- **No delays** - Intervene NOW

This isn't software. It's a business weapon.