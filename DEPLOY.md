# 🚀 SentientIQ Deployment Guide

## Marketing Site → sentientiq.ai (via Netlify)

### Why Netlify over GoDaddy Hosting:
- **GoDaddy** = Shared PHP hosting, no Node.js, slow FTP deploys
- **Netlify** = Git-based deploys, global CDN, automatic SSL, React-optimized

## Setup Steps:

### 1. Deploy to Netlify
```bash
# Option A: Use Netlify CLI
npm install -g netlify-cli
netlify deploy --prod

# Option B: Connect GitHub repo
# Go to app.netlify.com → Import existing project → Connect GitHub
```

### 2. Configure Custom Domain (sentientiq.ai)

#### In GoDaddy:
1. Log into GoDaddy → My Domains → sentientiq.ai
2. Click "DNS" → Manage DNS
3. Update these records:

```
Type    Name    Value                       TTL
A       @       75.2.60.5                   1 hour
CNAME   www     [your-site].netlify.app     1 hour
```

*Note: The A record IP (75.2.60.5) is Netlify's load balancer*

#### In Netlify:
1. Site Settings → Domain Management
2. Add custom domain: `sentientiq.ai`
3. Add domain alias: `www.sentientiq.ai`
4. Wait for SSL certificate (automatic, ~10 mins)

### 3. Environment Variables
In Netlify dashboard → Site settings → Environment variables:

```env
VITE_API_BASE=http://3.15.29.138:8000
VITE_API_URL=http://3.15.29.138:8000
VITE_INTEL_API_URL=http://3.15.29.138:8000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_[your-key]
```

### 4. Build Settings
Already configured in netlify.toml:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 18

## Alternative Options:

### Vercel (Also excellent)
- Similar to Netlify
- Better Next.js support if you migrate later
- Same custom domain process

### Cloudflare Pages (Fastest)
- Uses Cloudflare's network
- Free tier: unlimited bandwidth
- Built-in DDoS protection

### AWS Amplify
- If you're already in AWS ecosystem
- More complex but more control

## Marketing vs App Split

Consider splitting:
- `sentientiq.ai` → Marketing/landing pages (can use Math.random() theater!)
- `app.sentientiq.ai` → The actual SentientIQ app (no Math.random())

To implement:
1. Create subdomain in GoDaddy
2. Deploy app to separate Netlify site
3. Point subdomain CNAME to app deployment

## Deployment Checklist:

- [ ] Build production bundle: `npm run build`
- [ ] Test locally: `npm run preview`
- [ ] Deploy to Netlify
- [ ] Configure custom domain
- [ ] Verify SSL certificate
- [ ] Update API URLs for production
- [ ] Test all PhD agents work
- [ ] Test confetti scales with confidence
- [ ] Verify EVI Dashboard connects to SSE
- [ ] Check Clerk authentication flow
- [ ] Monitor for 24 hours

## Quick Deploy Commands:

```bash
# Build and preview locally
npm run build && npm run preview

# Deploy to Netlify (if CLI installed)
netlify deploy --prod --dir=dist

# Or use the UI deploy
# Drag dist folder to https://app.netlify.com/drop
```

## DNS Propagation:
- Takes 1-48 hours globally
- Check status: https://www.whatsmydns.net/#A/sentientiq.ai

---

Remember: The marketing site can have all the Math.random() theater it wants. The app must remain pure. 🎭