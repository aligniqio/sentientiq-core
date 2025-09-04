# Backend API Configuration

## EC2 Instance Details
- Instance ID: `i-0f1012d1b43ef9f61`
- Public IP: `3.15.29.138`
- Public DNS: `ec2-3-15-29-138.us-east-2.compute.amazonaws.com`
- Region: us-east-2

## Netlify Environment Variable Setup

### Option 1: Direct EC2 (Temporary)
```
API_ORIGIN = http://3.15.29.138:8000
```
or
```
API_ORIGIN = http://ec2-3-15-29-138.us-east-2.compute.amazonaws.com:8000
```

### Option 2: Via ALB (Recommended)
```
API_ORIGIN = https://YOUR-ALB-DNS.us-east-2.elb.amazonaws.com
```

## To Configure in Netlify:

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your site: `sentientiq-core-collective`
3. Go to Site Settings → Environment Variables
4. Add new variable:
   - Key: `API_ORIGIN`
   - Value: (see options above)
5. Save and redeploy

## Test the Connection:

Once configured, test the PhD agents:
```bash
# Test locally with curl
curl https://sentientiq.app/api/health

# Or test the ask endpoint
curl -X POST https://sentientiq.app/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Should we launch?", "agent": "Strategy"}'
```

## API Endpoints:
- `/api/ask` - PhD agent decisions
- `/api/pulse` - EVI live stream (SSE)
- `/api/health` - Health check

## Backend Ports:
- Port 8000: FastAPI application
- Port 80/443: If using ALB

## Notes:
- The edge function strips `/api` prefix before forwarding
- Clerk auth headers are automatically injected
- SSE/streaming is preserved for real-time features