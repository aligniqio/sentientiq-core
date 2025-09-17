# SentientIQ Unified Script Deployment Guide

## Overview

The SentientIQ Unified Script (`sentientiq-unified.js`) is a complete behavioral intelligence system that combines:
- 120Hz biomechanical telemetry capture
- FFT-based tremor analysis for stress detection
- Micro-gesture recognition (circles, zigzags, dwelling)
- Real-time intervention delivery
- Bidirectional WebSocket communication

## File Locations

- **Production Script**: `/marketing-website/public/sentientiq-unified.js`
- **Test Page**: `/marketing-website/public/test-unified.html`
- **CDN URL**: `https://sentientiq.ai/sentientiq-unified.js`

## Local Testing

1. **Start the telemetry gateway** (Port 3002):
```bash
cd orchestrator
npm run gateway
```

2. **Start the intervention broadcaster** (Port 3004):
```bash
cd orchestrator
npm run broadcaster
```

3. **Open the test page**:
```bash
cd marketing-website
npm run dev
# Navigate to: http://localhost:3000/test-unified.html
```

## Production Deployment

### Step 1: Deploy to Netlify

```bash
cd marketing-website
npm run build
# The unified script will be included in the build
```

The script will be available at: `https://sentientiq.ai/sentientiq-unified.js`

### Step 2: GTM Configuration

Add this Custom HTML tag in Google Tag Manager:

```html
<!-- SentientIQ Unified Behavioral Intelligence -->
<script>
  // Configuration
  window.SENTIENTIQ_TENANT_ID = 'your-tenant-id'; // Replace with actual tenant ID
  window.SENTIENTIQ_DEBUG = false; // Set to true for console logging
  window.SENTIENTIQ_ENABLE_INTERVENTIONS = true; // Set to false to disable interventions
</script>
<script src="https://sentientiq.ai/sentientiq-unified.js" async></script>
```

**Trigger**: All Pages

### Step 3: Direct Website Integration (Alternative to GTM)

Add to your website's `<head>` tag:

```html
<!-- SentientIQ Unified Script -->
<script>
  window.SENTIENTIQ_TENANT_ID = 'your-tenant-id';
  window.SENTIENTIQ_DEBUG = false;
  window.SENTIENTIQ_ENABLE_INTERVENTIONS = true;
</script>
<script src="https://sentientiq.ai/sentientiq-unified.js" async></script>
```

## Configuration Options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SENTIENTIQ_TENANT_ID` | string | 'demo' | Your unique tenant identifier |
| `SENTIENTIQ_DEBUG` | boolean | false | Enable console logging |
| `SENTIENTIQ_ENABLE_INTERVENTIONS` | boolean | true | Enable/disable intervention rendering |

## Server Endpoints

### Production Endpoints
- **Telemetry Gateway**: `ws://98.87.12.130:3002/ws`
- **HTTP Fallback**: `http://98.87.12.130:3002/api/telemetry`
- **Intervention Broadcaster**: `ws://98.87.12.130:3004/ws/interventions`

### Local Development Endpoints
- **Telemetry Gateway**: `ws://localhost:3002/ws`
- **HTTP Fallback**: `http://localhost:3002/api/telemetry`
- **Intervention Broadcaster**: `ws://localhost:3004/ws/interventions`

## Features Captured

### Mouse Physics (120Hz)
- Position (x, y)
- Velocity (vx, vy)
- Acceleration (ax, ay)
- Jerk (jx, jy) - Rate of acceleration change

### Micro-gestures
- Circular motions (confusion indicator)
- Zigzag patterns (frustration indicator)
- Dwelling/hesitation (> 500ms in place)

### Tremor Analysis (FFT)
- 8-12 Hz frequency detection
- Stress/anxiety indicator
- 32-sample buffer analysis

### Interaction Patterns
- Rage clicks (3+ clicks in 500ms)
- Text selection (with price detection)
- Tab switching (comparison shopping)
- Scroll depth and velocity
- Form field abandonment
- Viewport proximity and exit vectors

## Intervention Types

The system can render these interventions:

1. **Exit Intent Modal** - Discount offer when leaving
2. **Help Tooltip** - Assistance offer
3. **Price Assistant** - Price information context
4. **Guidance Helper** - Navigation tips
5. **Cart Save Urgent** - Urgency for cart completion
6. **Discount Offer** - Time-limited promotions
7. **Free Shipping** - Shipping threshold notifications
8. **Reassurance** - Trust indicators

## Testing Checklist

### Pre-deployment
- [ ] Test mouse tracking at 120Hz sampling rate
- [ ] Verify FFT tremor analysis (8-12Hz detection)
- [ ] Test micro-gesture detection (circles, zigzags)
- [ ] Verify rage click detection (3+ clicks in 500ms)
- [ ] Test text selection with price detection
- [ ] Verify tab switching tracking
- [ ] Test scroll depth and velocity capture

### WebSocket Connections
- [ ] Telemetry connects to port 3002
- [ ] Data batches sent every 2 seconds
- [ ] HTTP fallback works if WebSocket fails
- [ ] Intervention WebSocket connects to port 3004
- [ ] Interventions render correctly

### Intervention Rendering
- [ ] Modals appear and can be closed
- [ ] Tooltips position correctly
- [ ] Banners don't interfere with content
- [ ] Intervention acknowledgments sent back

### Dashboard Verification
- [ ] Real-time emotions appear in /pulse
- [ ] Intervention triggers logged
- [ ] Session tracking works correctly

## Monitoring

### Check Console Logs
```javascript
// Enable debug mode for detailed logging
window.SENTIENTIQ_DEBUG = true;
```

### Verify Session Storage
```javascript
// Check session ID
console.log(sessionStorage.getItem('sq_session_id'));
```

### Monitor Network Tab
- Look for WebSocket connections to ports 3002 and 3004
- Verify telemetry batches being sent
- Check intervention messages received

## Common Issues

### Script Not Loading
- Verify script URL is accessible
- Check for Content Security Policy blocking
- Ensure async attribute is present

### WebSocket Connection Failed
- Check firewall rules for ports 3002 and 3004
- Verify server is running
- Test HTTP fallback is working

### Interventions Not Showing
- Verify `SENTIENTIQ_ENABLE_INTERVENTIONS` is true
- Check intervention WebSocket connection
- Look for z-index conflicts with site CSS

### High CPU Usage
- Reduce sampling rate if needed (default 120Hz)
- Check for memory leaks in console
- Verify cleanup on page unload

## Performance Impact

- **Script Size**: ~45KB (unminified)
- **Memory Usage**: < 10MB typical
- **CPU Usage**: < 2% on modern devices
- **Network**: ~5KB/min telemetry data

## Security Considerations

- No PII (Personally Identifiable Information) collected
- Session IDs are anonymous and temporary
- All data transmitted over secure WebSocket
- No cookies or local storage for tracking

## Support

For issues or questions:
- GitHub Issues: https://github.com/sentientiq/core/issues
- Documentation: https://sentientiq.ai/docs
- Email: support@sentientiq.ai

## Version History

- **v7.0** - Unified telemetry + interventions
- **v6.0** - Added FFT tremor analysis
- **v5.0** - Intervention system integration
- **v4.0** - Enhanced micro-gesture detection
- **v3.0** - 120Hz sampling implementation
- **v2.0** - Basic telemetry capture
- **v1.0** - Initial prototype