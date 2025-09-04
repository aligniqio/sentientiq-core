# Unstuck - Developer's BS Detector 🔍

## Is it really AI, or just Math.random()?

That weird feeling you have about your codebase? You're probably right.

### What Unstuck Does

Unstuck is a forensic tool that helps developers identify when "AI-powered" platforms are actually using random number generators. It's like Chrome DevTools, but for detecting BS.

### Features

- 🎲 **Math.random() Detection**: Catches RNG usage in "AI" contexts
- 🔄 **Replay Test**: Refresh and watch "historical" data magically change
- 📊 **Benford's Law Analysis**: Real data has patterns. Fake data doesn't.
- ⚡ **Network Timing Analysis**: Instant responses = client-side generation
- 📸 **Screenshot Evidence**: Proof for when nobody believes you

### Who This Is For

- Developers maintaining "AI platforms" at 2am
- Engineers who've found `// TODO: Implement actual ML` in production
- Teams paying $60k/year for enterprise Math.random()
- Anyone who's been told "you wouldn't understand the algorithm"

### How to Use

1. Install from Chrome Web Store
2. Navigate to any "AI-powered" dashboard
3. Click the Unstuck icon
4. Watch the truth unfold
5. Screenshot everything
6. Share with your team (or Twitter)

### What You'll Find

```javascript
// What they told you:
function getAIScore(account) {
  return proprietaryMLAlgorithm.predict(account);
}

// What Unstuck reveals:
function getAIScore(account) {
  // TODO: Implement actual AI
  return Math.random() * 100;
}
```

### Legal Notice

This tool performs client-side analysis only. It doesn't hack, breach, or access any private systems. It simply observes JavaScript execution patterns that are already running in your browser. If your vendor says this tool is "malicious," ask them why detecting Math.random() is a threat to their "AI."

### The Truth Will Set You Free (From Bad Vendors)

Built with 💔 by developers who've seen too much.

---

*"That weird feeling about the codebase? You were right all along."*