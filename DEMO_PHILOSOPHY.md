# Demo Account Philosophy
## The Crystal Palace of Marketing Truth

### What Demo Accounts ARE:
- **Clickarounds** - Let skeptics explore the UI
- **Isolated sandboxes** - Completely separate from real data
- **Time-bombed** - Auto-expire and self-destruct
- **Read-only tourists** - Can look but can't touch

### What Demo Accounts ARE NOT:
- NOT mock data generators for production
- NOT "sample insights" to pad reports  
- NOT Math.Random() bullshit factories
- NOT a substitute for real emotional detection

### The Line in the Sand:
```sql
-- Demo data ONLY exists where is_demo = true
-- Demo users can ONLY see demo organizations
-- Demo organizations NEVER appear in real analytics
-- Demo data NEVER influences real recommendations
```

### Why This Matters:
We're building for marketers who are drowning in 6sense dashboards they don't understand. They need REAL emotions from REAL users making REAL decisions. Not another dashboard of generated nonsense.

Every emotion detected is real.
Every intervention is purposeful.
Every insight is earned.

**No Math.Random(). No GenerateBullshitInsights(). Ever.**

The glassmorphism isn't just aesthetic - it's philosophical. You can see through to the truth. No opacity. No hiding behind "sample data."

### Technical Enforcement:
1. Demo orgs have `is_demo = true` - hardcoded, immutable
2. Demo data lives in demo orgs only
3. RLS policies prevent demo users from creating/modifying
4. Auto-cleanup removes expired demos
5. Main app filters OUT all demo orgs by default:

```typescript
// ALWAYS exclude demo data from real analytics
const realOrgs = await supabase
  .from('organizations')
  .select('*')
  .eq('is_demo', false);  // The truth filter
```

### The Commitment:
When a marketer sees "47 rage clicks detected" - that's 47 real humans, really pissed off, really about to leave. Not Math.Random() * 50.

This is the death of fake insights.
This is the Crystal Palace of Marketing Truth.
This is SentientIQ.

---

*"Every emotion has a dollar value. Every fake emotion has a negative value."*