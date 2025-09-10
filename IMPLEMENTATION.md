# SentientIQ Implementation Guide
## Add Emotional Intelligence to Your Site in 5 Minutes

### The One-Line Script Tag (Coming Soon)

```html
<!-- Add this before </body> -->
<script src="https://cdn.sentientiq.ai/v1/detect.js" data-api-key="YOUR_KEY"></script>
```

That's it. We're now detecting emotions on your site.

---

## What You Get Immediately

### 1. Automatic Emotion Detection
- **Rage**: 3+ clicks in <300ms
- **Hesitation**: 2+ second hovers
- **Confusion**: Erratic scrolling patterns
- **Sticker Shock**: Mouse deceleration near prices
- **Abandonment**: 60+ seconds idle

### 2. Real-Time Interventions
```javascript
// These fire automatically when emotions are detected
window.SentientIQ.on('emotion', (event) => {
  console.log(`Detected: ${event.state} at ${event.confidence}% confidence`);
  
  // Your custom intervention
  if (event.state === 'rage' && event.confidence > 85) {
    // Show help chat
    // Simplify UI
    // Offer discount
  }
});
```

### 3. Predictive Warnings
```javascript
window.SentientIQ.on('prediction', (event) => {
  if (event.action === 'abandonment' && event.timeWindow < 3000) {
    // They're leaving in 3 seconds!
    // DO SOMETHING NOW
  }
});
```

---

## Full Implementation (For Developers)

### Step 1: Install the Package

```bash
npm install @sentientiq/detector
# or
yarn add @sentientiq/detector
```

### Step 2: Initialize in Your App

```javascript
import { SentientIQ } from '@sentientiq/detector';

// Initialize with your API key
const sq = new SentientIQ({
  apiKey: process.env.SENTIENTIQ_API_KEY,
  
  // Optional: Customize detection thresholds
  thresholds: {
    rageClickMs: 300,      // Default: 300ms
    hesitationMs: 2000,    // Default: 2000ms
    abandonmentMs: 60000   // Default: 60000ms
  },
  
  // Optional: Enable specific detectors
  detectors: {
    rage: true,
    hesitation: true,
    confusion: true,
    stickerShock: true,
    abandonment: true
  }
});

// Start detecting
sq.start();
```

### Step 3: Handle Emotional Events

```javascript
// Listen for any emotion
sq.on('emotion', (event) => {
  console.log('Emotion detected:', {
    state: event.state,
    confidence: event.confidence,
    intensity: event.intensity,
    predictedAction: event.predictedAction,
    interventionWindow: event.interventionWindow
  });
});

// Listen for specific emotions
sq.on('rage', (event) => {
  // Deploy rage intervention
  showSupportChat();
  simplifyUI();
});

sq.on('sticker_shock', (event) => {
  // Price sensitivity detected!
  if (event.nearElement.includes('pricing')) {
    offerDiscount(10);
    showPaymentPlans();
  }
});

sq.on('confusion', (event) => {
  // User is lost
  showGuidedTour();
  highlightNextStep();
});
```

### Step 4: Track Outcomes (For Learning)

```javascript
// Tell us what actually happened
sq.recordOutcome({
  sessionId: sq.sessionId,
  predictedAction: 'abandonment',
  actualAction: 'purchase',
  interventionUsed: 'discount_popup',
  revenue: 497.00
});

// This makes us smarter for YOUR specific customers
```

---

## React Implementation

```jsx
import { useEmotionalIntelligence } from '@sentientiq/react';

function App() {
  const { currentEmotion, confidence, predict } = useEmotionalIntelligence({
    apiKey: process.env.REACT_APP_SENTIENTIQ_KEY
  });
  
  // Automatic interventions based on emotion
  useEffect(() => {
    if (currentEmotion === 'rage' && confidence > 85) {
      setShowHelp(true);
    }
    
    if (currentEmotion === 'sticker_shock') {
      setShowDiscount(true);
    }
  }, [currentEmotion, confidence]);
  
  return (
    <div>
      {/* Your app */}
      
      {showHelp && <HelpChat />}
      {showDiscount && <DiscountBanner />}
    </div>
  );
}
```

---

## Next.js Implementation

```jsx
// pages/_app.js
import { SentientIQProvider } from '@sentientiq/nextjs';

export default function App({ Component, pageProps }) {
  return (
    <SentientIQProvider 
      apiKey={process.env.NEXT_PUBLIC_SENTIENTIQ_KEY}
      enableVisualTrails={false} // Set true for debugging
    >
      <Component {...pageProps} />
    </SentientIQProvider>
  );
}

// Any component
import { useEmotion } from '@sentientiq/nextjs';

function PricingPage() {
  const { detectStickerShock } = useEmotion();
  
  useEffect(() => {
    detectStickerShock({
      priceElements: ['.price', '#pricing'],
      onDetected: (confidence) => {
        if (confidence > 80) {
          // Show lower tier
          // Offer payment plan
          // Display testimonials
        }
      }
    });
  }, []);
}
```

---

## WordPress Plugin (Coming Soon)

```php
// Just activate the plugin
// No code required
// Emotions detected automatically
// Interventions configured in WordPress admin
```

---

## Shopify App (Coming Soon)

```liquid
<!-- Add to theme.liquid -->
{% include 'sentientiq-detector' %}

<!-- Automatic cart abandonment prevention -->
<!-- Automatic sticker shock discounts -->
<!-- Automatic confusion-to-chat routing -->
```

---

## The Data You Get Back

### Real-Time Dashboard
- Current emotional state of all visitors
- Intervention success rates
- Revenue saved from prevented abandonment
- Blind spots in your detection

### Weekly Accountability Report
```json
{
  "recommendations_made": 47,
  "recommendations_acted_on": 12,
  "success_rate": "74%",
  "revenue_saved": 23420,
  "revenue_lost_from_ignored": 8930,
  "top_ignored_emotion": "sticker_shock",
  "cost_of_ignoring": "$8,930"
}
```

---

## Pricing

### Starter - $497/month
- Up to 10,000 sessions
- Basic emotions (rage, hesitation, confusion)
- Weekly reports

### Growth - $1,997/month  
- Up to 100,000 sessions
- All emotions + predictions
- Real-time interventions
- Machine learning

### Scale - $4,997/month
- Unlimited sessions
- Custom emotion models
- API access
- Your data moat

---

## Get Started Now

1. **Sign up**: [sentientiq.ai/start](https://sentientiq.ai/start)
2. **Get your API key**: Instant, no waiting
3. **Add the script**: One line of code
4. **Watch emotions appear**: Real-time in your dashboard

---

## FAQ

**Q: Is this real?**
A: Yes. No mock data. Pure behavioral physics.

**Q: Does it slow down my site?**
A: No. 4KB gzipped, async loaded, 0ms blocking.

**Q: GDPR compliant?**
A: Yes. No PII stored, only emotional patterns.

**Q: Can I customize interventions?**
A: Yes. Full control over what happens when.

**Q: What if I ignore the recommendations?**
A: We'll tell you exactly how much money you lost.

---

## Support

- Email: help@sentientiq.ai
- Docs: [docs.sentientiq.ai](https://docs.sentientiq.ai)
- Status: [status.sentientiq.ai](https://status.sentientiq.ai)

---

*Marketing at the Speed of Emotion™*

*No math.random(). No mock data. Just behavioral physics.*