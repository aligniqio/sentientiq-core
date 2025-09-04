# SentientIQ Monetization System

## Overview
Complete billing infrastructure integrating Stripe, Clerk, and FastAPI with usage-based rate limiting.

## Architecture

### Frontend
- **Pricing Page** (`/pricing`): Three-tier pricing with Stripe Checkout
- **Billing Dashboard** (`/billing`): Current subscription, usage metrics, manage subscription
- **Checkout Handler** (`src/lib/checkout.ts`): Stripe integration with Clerk user context

### Backend
- **Usage Gate** (`backend/billing/usage_gate.py`): Rate limiting based on plan
  - Free: 20 questions/month
  - Pro: Unlimited questions
  - Team: Unlimited + API access
  - Enterprise: Custom limits

- **Stripe → Clerk Webhook** (`backend/billing/stripe_clerk_webhook.py`)
  - Updates Clerk `public_metadata.plan` on subscription changes
  - Handles checkout completion, subscription updates, cancellations
  - Plan automatically reflected in JWT for instant access control

- **Checkout API** (`backend/billing/checkout.py`)
  - Creates Stripe Checkout sessions with Clerk metadata
  - Customer Portal for subscription management

### Netlify Edge Proxy
- Routes `/api/*` to FastAPI backend
- Extracts Clerk session from cookies
- Injects auth headers (X-User-Id, X-Plan)
- Handles SSE streaming for real-time data

## Pricing Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0 | 20 questions/month, 1hr EVI delay |
| **Pro** | $199/mo | Unlimited questions, Live EVI, Full explanations |
| **Team** | $999/mo | 10 seats, API access, Slack integration |
| **Enterprise** | $5,000+/mo | Custom limits, SLA, dedicated support |

## Environment Variables

### Frontend (.env)
```
VITE_API_BASE=/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
VITE_STRIPE_PRO_PRICE_ID=price_xxx
VITE_STRIPE_TEAM_PRICE_ID=price_xxx
```

### Backend (.env)
```
# Stripe
STRIPE_API_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Clerk
CLERK_SECRET_KEY=sk_test_xxx

# Plan Mapping
PLAN_MAP=price_123=pro,price_456=team

# Usage Gate
AUTH_MODE=clerk
USAGE_STORE=memory  # or dynamo for production
USAGE_SCOPE=user     # or org for team billing
```

### Netlify Environment
```
API_ORIGIN=http://your-ec2-ip:8000
```

## Deployment Steps

1. **Create Stripe Products**
   - Create Pro subscription at $199/mo
   - Create Team subscription at $999/mo
   - Note the Price IDs

2. **Configure Clerk**
   - Ensure Clerk is set up with your domain
   - Note the publishable and secret keys

3. **Deploy Backend**
   ```bash
   # On EC2
   cd backend
   pip install stripe requests
   export STRIPE_API_KEY=sk_live_xxx
   export CLERK_SECRET_KEY=sk_live_xxx
   export PLAN_MAP=price_pro=pro,price_team=team
   python app.py
   ```

4. **Deploy Frontend**
   ```bash
   # Set env vars in Netlify
   git push origin main
   # Netlify auto-deploys
   ```

5. **Configure Stripe Webhook**
   - In Stripe Dashboard, add webhook endpoint:
     `https://yourdomain.com/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.*`
   - Note the webhook secret

6. **Test Payment Flow**
   - Sign up for free account
   - Visit /pricing
   - Click "Upgrade to Pro"
   - Complete Stripe Checkout (use test card 4242424242424242)
   - Verify plan updated in Clerk dashboard
   - Test /ask endpoint - should allow unlimited

## Usage Tracking

The system tracks usage at two levels:
- **Monthly limits**: Enforced per plan (402 Payment Required when exceeded)
- **Per-minute caps**: Rate limiting to prevent abuse (429 Too Many Requests)

Usage is stored in memory by default, or DynamoDB for production:

```hcl
# Terraform for DynamoDB table
resource "aws_dynamodb_table" "usage" {
  name         = "sentientiq-usage"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "owner"
  range_key    = "month"
  
  attribute { name = "owner"; type = "S" }
  attribute { name = "month"; type = "S" }
}
```

## Testing Checklist

- [ ] Free user can ask 20 questions
- [ ] 21st question shows upgrade prompt
- [ ] Stripe Checkout completes successfully
- [ ] Plan updates in Clerk immediately
- [ ] Pro user has unlimited access
- [ ] Billing page shows current subscription
- [ ] Customer Portal allows plan changes
- [ ] Cancellation downgrades to free

## Revenue Model

Based on typical SaaS metrics:
- Free → Pro conversion: 2-5%
- Pro retention: 85-90% annually
- Average Revenue Per User: $199/mo (Pro) or $99.90/mo (per Team seat)
- Break-even: ~25 Pro subscribers ($5k MRR)

## Support

- Stripe Dashboard: https://dashboard.stripe.com
- Clerk Dashboard: https://dashboard.clerk.com
- AWS Console: https://console.aws.amazon.com

Remember: **"Revenue is a lagging indicator of emotion."** The system is built to respect that truth.