# SentientIQ Core

## The Last Software You'll Ever Notice

No dashboards. No features. No settings. Just intelligence.

## What This Is

12 PhDs that answer your questions. That's it. That's the product.

## Architecture

```
You ask → PhDs think → You get an answer → Done
```

## Pages

- `/` - How it works (and why everything else doesn't)
- `/faculty` - Meet your PhD collective  
- `/training` - Verify their credentials on-chain

## The API

One endpoint: `POST /api/ask`

```json
// Request
{ "question": "Our CAC is too high" }

// Response
{
  "answer": "Shift budget to LinkedIn Tue 3:15pm",
  "confidence": 82,
  "factors": [...]
}
```

## Setup

```bash
npm install
npm run dev
```

## Environment

```
VITE_CLERK_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_INTEL_API_URL=http://13.59.218.202:3001
```

## Philosophy

Software should disappear. Intelligence should just happen.

## Death Count

- Dashboards: ∞
- Features: All of them
- Settings: Dead
- Onboarding: Extinct
- Math.random(): Exposed and destroyed

---

*Built in rage against Math.random() and dashboard tyranny.*