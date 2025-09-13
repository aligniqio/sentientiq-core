# SentientIQ SDK

**One line to save millions.**

## Installation

### Script Tag (Recommended)
```html
<script src="https://cdn.sentientiq.app/sdk.js" data-api-key="YOUR_API_KEY"></script>
```

That's it. Seriously. The SDK will:
- Auto-initialize on page load
- Auto-identify users from your existing auth
- Start tracking emotions immediately
- Handle interventions automatically

### NPM
```bash
npm install @sentientiq/sdk
```

```javascript
import SentientIQ from '@sentientiq/sdk';
SentientIQ.init('YOUR_API_KEY');
```

### Yarn
```bash
yarn add @sentientiq/sdk
```

## What It Does

The SDK tracks behavioral physics to detect emotions in real-time:
- **Rage**: Violent mouse movements + high acceleration
- **Abandonment**: Sudden exit velocity patterns
- **Confusion**: Chaotic movement patterns
- **Purchase Intent**: Hover patterns on CTAs
- **Sticker Shock**: Recoil from pricing

When critical emotions are detected on high-value customers, interventions trigger instantly:
- CEO gets a text within 3 seconds
- Chat opens proactively
- Discounts appear
- Support escalates

## Zero Configuration

The SDK automatically:
- **Identifies users** from Clerk, Auth0, Firebase, Supabase, or custom auth
- **Tracks sections** (hero, pricing, demo, testimonials)
- **Uses WebWorkers** for non-blocking processing
- **Falls back** to beacon API if WebSocket fails
- **Batches events** for efficiency

## Manual Configuration (Optional)

### Identify Users
```javascript
SentientIQ.identify('user_123', {
  email: 'john@company.com',
  company: 'Acme Corp',
  plan: 'enterprise',
  ltv: 120000  // Annual contract value
});
```

### Track Custom Events
```javascript
SentientIQ.track('feature_used', {
  feature: 'advanced_analytics',
  duration: 45
});
```

### Track Revenue
```javascript
SentientIQ.revenue(9900, {
  plan: 'growth',
  period: 'annual'
});
```

## Listen for Events

### Emotion Detection
```javascript
SentientIQ.on('emotion', (data) => {
  console.log(`Detected ${data.emotion} at ${data.confidence}% confidence`);
});
```

### Interventions
```javascript
SentientIQ.on('intervention', (data) => {
  // Custom intervention handling
  if (data.action === 'show_discount') {
    showCustomDiscountModal(data);
  }
});
```

## Integration Examples

### React
```jsx
import { useEffect } from 'react';
import SentientIQ from '@sentientiq/sdk';

function App() {
  useEffect(() => {
    SentientIQ.init('YOUR_API_KEY');
    
    // Auto-identifies from your auth
    if (user) {
      SentientIQ.identify(user.id, {
        email: user.email,
        ltv: user.subscription.annual_value
      });
    }
  }, [user]);
  
  return <YourApp />;
}
```

### Vue
```javascript
import SentientIQ from '@sentientiq/sdk';

export default {
  mounted() {
    SentientIQ.init('YOUR_API_KEY');
    
    if (this.$auth.user) {
      SentientIQ.identify(this.$auth.user.id, {
        email: this.$auth.user.email,
        ltv: this.$auth.user.plan_value
      });
    }
  }
}
```

### Next.js
```javascript
// pages/_app.js
import { useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import SentientIQ from '@sentientiq/sdk';

function MyApp({ Component, pageProps }) {
  const { user } = useUser();
  
  useEffect(() => {
    SentientIQ.init(process.env.NEXT_PUBLIC_SENTIENTIQ_KEY);
    
    if (user) {
      SentientIQ.identify(user.id, {
        email: user.emailAddresses[0].emailAddress,
        company: user.organizationMemberships[0]?.organization.name
      });
    }
  }, [user]);
  
  return <Component {...pageProps} />;
}
```

## Performance

- **Bundle Size**: 7.8KB minified + gzipped
- **Non-blocking**: Uses WebWorker for processing
- **Batching**: Groups events for efficiency
- **Sampling**: 50ms between physics calculations
- **Fallback**: Beacon API if WebSocket fails

## Privacy

The SDK tracks:
- Mouse position and velocity
- Scroll position and speed
- Click targets (no input values)
- Page sections
- NO personal data unless you explicitly provide it via `identify()`
- NO keystrokes
- NO form values
- NO screenshots

## Testing

Test your integration:
```javascript
// Trigger test rage
SentientIQ.track('test_rage', { velocity: 1000 });

// Check connection
console.log('Connected:', SentientIQ.connected);
console.log('Session:', SentientIQ.sessionId);
```

## Support

- Documentation: https://docs.sentientiq.app
- Issues: https://github.com/sentientiq/sdk/issues
- Email: support@sentientiq.app

## The Result

When a $100k customer shows rage:
1. CEO gets a text in <3 seconds
2. Dashboard link opens intervention tools
3. Customer is saved
4. Revenue is protected

**Every emotion has a price. Every intervention has an ROI.**

No configuration. No complexity. Just results.