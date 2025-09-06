# 🚨 EMERGENCY KEY ROTATION CHECKLIST 🚨

## Status: KEYS EXPOSED - ROTATION REQUIRED

### 1. **STRIPE** ⚠️ CRITICAL (Payment Processing)
- [ ] Go to: https://dashboard.stripe.com/apikeys
- [ ] Click "Roll" on the Secret Key
- [ ] Copy new key starting with `sk_live_`
- [ ] Update in `.env` and `backend/.env`
- [ ] Status: EXPOSED - ROTATE IMMEDIATELY

### 2. **ANTHROPIC** ⚠️ CRITICAL (Claude API)
- [ ] Go to: https://console.anthropic.com/settings/keys
- [ ] Create new API key
- [ ] Delete old key
- [ ] Copy new key starting with `sk-ant-`
- [ ] Update in `backend/.env`
- [ ] Status: EXPOSED - ROTATE IMMEDIATELY

### 3. **XAI (Grok)** ⚠️ CRITICAL
- [ ] Go to: https://console.x.ai/
- [ ] Navigate to API Keys
- [ ] Regenerate key
- [ ] Copy new key
- [ ] Update in `backend/.env`
- [ ] Status: EXPOSED - ROTATE IMMEDIATELY

### 4. **GITHUB** 🔒 (Less Critical - Just Notifications)
- [ ] They're just warning you about the exposure
- [ ] No action needed here
- [ ] Maybe create a Personal Access Token if using GitHub API

### 5. **GOOGLE CLOUD** ⚠️ CHECK IF EXPOSED
- [ ] Check which service (Firebase? GCP?)
- [ ] Go to: https://console.cloud.google.com/apis/credentials
- [ ] Regenerate any exposed service account keys
- [ ] Download new JSON key file

### 6. **CLERK** ⚠️ CHECK STATUS
- [ ] Go to: https://dashboard.clerk.com/
- [ ] Navigate to API Keys
- [ ] Rotate both Publishable and Secret keys if needed

## QUICK ROTATION SCRIPT

After getting all new keys, update this and run:

```bash
# Update these with your NEW keys
export NEW_STRIPE_KEY="sk_live_XXX"
export NEW_ANTHROPIC_KEY="sk-ant-XXX"
export NEW_XAI_KEY="xai_XXX"
export NEW_CLERK_SECRET="sk_live_XXX"
export NEW_GOOGLE_KEY="XXX"

# Run the update script
./UPDATE_KEYS.sh
```

## PRIORITY ORDER:
1. **Stripe** - This handles money!
2. **Anthropic/xAI** - Core functionality
3. **Google Cloud** - Depends what it's used for
4. **Clerk** - Auth system
5. **GitHub** - Just notifications

## REMEMBER:
- The site is LIVE and WORKING
- Rotate keys one at a time
- Test after each rotation
- The .gitignore is now in place - won't happen again!

---
⚡️ Zeus is standing by to help with the rotation!