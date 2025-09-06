# 🔍 Intent Data Auditor - Testing Guide

## Quick Test (2 minutes)

### 1. Load the Extension
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `extension` folder

### 2. Test Math.random() Detection
1. Open `test-page.html` in Chrome
2. Click the extension icon in toolbar
3. Click "Generate Intent Score" on the test page
4. Check the extension popup - should show detections!

### 3. What to Look For
✅ **WORKING** if you see:
- Red counter increasing when you click test buttons
- "Math.random() detected!" alerts
- Detection log in the popup
- Console warnings about fraud

❌ **NOT WORKING** if:
- No alerts when clicking test buttons
- Counter stays at 0
- Console errors
- Popup doesn't open

## Testing on Real Sites

### Test on 6sense.com
1. Navigate to 6sense.com
2. Open extension popup
3. Should show: "Monitoring for Math.random() usage"
4. Any dynamic content = potential detections

### Test on Demandbase.com
1. Navigate to demandbase.com
2. Check for intent score demos
3. Extension should catch any Math.random() in their scripts

## Expected Results

**Fake Intent Buttons** → Instant detection
**Real Data Buttons** → No detection
**Background Processing** → Catches every 5 seconds

## Console Commands for Testing

Open DevTools Console and run:
```javascript
// This SHOULD trigger detection
Math.random() * 100

// This should NOT trigger
Date.now()
```

## Ready for Store?

If all tests pass:
1. Icons are generated (or use placeholders)
2. No console errors
3. Detections work on test page
4. Popup displays correctly
5. **Ship it! 🚀**

---

**The extension that exposes Math.random() fraud in MarTech!**