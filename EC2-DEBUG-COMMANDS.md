# EC2 Pipeline Debug Commands

## Quick Health Check
```bash
# SSH into EC2
ssh ec2-user@api.sentientiq.app

# Check all PM2 processes
pm2 list

# Quick health check
pm2 status
```

## 1. Telemetry Gateway (Port 3002)
```bash
# Check logs
pm2 logs telemetry-gateway --lines 50

# Monitor real-time
pm2 monit telemetry-gateway

# Restart if needed
pm2 restart telemetry-gateway

# Check if port is listening
sudo netstat -tlnp | grep 3002

# Test WebSocket connection
wscat -c wss://api.sentientiq.app/ws/telemetry
```

## 2. Redis Stream Check
```bash
# Connect to Redis
redis-cli

# Check stream length
XLEN telemetry_events

# Read last 5 events from stream
XREAD COUNT 5 STREAMS telemetry_events $

# Read ALL events from beginning (careful!)
XREAD COUNT 10 STREAMS telemetry_events 0

# Monitor pub/sub channel
SUBSCRIBE emotional_events

# Check if events are being written
XINFO STREAM telemetry_events

# Clear stream if needed (CAREFUL!)
# DEL telemetry_events
```

## 3. Behavior Processor (Production)
```bash
# Check logs
pm2 logs behavior-processor-production --lines 50

# Monitor in real-time
pm2 monit behavior-processor-production

# Restart if stuck
pm2 restart behavior-processor-production

# Check environment variables
pm2 env behavior-processor-production

# Force restart with updated env
pm2 restart behavior-processor-production --update-env
```

## 4. Emotional Broadcaster (Port 3003)
```bash
# Check logs
pm2 logs emotional-broadcaster --lines 50

# Monitor connections
pm2 monit emotional-broadcaster

# Restart
pm2 restart emotional-broadcaster

# Test WebSocket
wscat -c wss://api.sentientiq.app/ws/emotions
# Once connected, send:
{"type":"subscribe","tenant":null,"filter":null}

# Check if port is listening
sudo netstat -tlnp | grep 3003
```

## 5. Intervention Broadcaster (Port 3004)
```bash
# Check logs
pm2 logs intervention-broadcaster --lines 50

# Test WebSocket
wscat -c wss://api.sentientiq.app/ws/interventions

# Check port
sudo netstat -tlnp | grep 3004
```

## 6. Nginx WebSocket Proxy Check
```bash
# Check nginx status
sudo systemctl status nginx

# Test nginx config
sudo nginx -t

# View nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Reload nginx
sudo systemctl reload nginx
```

## 7. Full Pipeline Test
```bash
# Step 1: Clear Redis (optional)
redis-cli
> DEL telemetry_events
> exit

# Step 2: Monitor all services
pm2 logs --lines 0

# Step 3: Send test event (from another terminal)
cat > test-event.json << EOF
{
  "type": "telemetry",
  "sessionId": "test-$(date +%s)",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)",
  "pageUrl": "https://sentientiq.ai/test",
  "data": {
    "mouseX": 500,
    "mouseY": 500,
    "velocityX": 1000,
    "velocityY": 1000,
    "accelerationX": 2000,
    "accelerationY": 2000,
    "clickCount": 5,
    "scrollDelta": 0,
    "timeOnPage": 5000
  }
}
EOF

# Send via wscat
echo '{"type":"telemetry","sessionId":"test-'$(date +%s)'","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","pageUrl":"https://sentientiq.ai/test","data":{"mouseX":500,"mouseY":500,"velocityX":1000,"velocityY":1000,"accelerationX":2000,"accelerationY":2000,"clickCount":5,"scrollDelta":0,"timeOnPage":5000}}' | wscat -c wss://api.sentientiq.app/ws/telemetry
```

## 8. Check Supabase
```bash
# Check environment
cat /home/ec2-user/.env | grep SUPABASE

# Test connection (if you have psql)
# psql "postgresql://[user]:[pass]@[host]/postgres"
```

## 9. Full System Restart
```bash
# Restart all PM2 processes
pm2 restart all

# Or restart in sequence
pm2 restart telemetry-gateway
sleep 2
pm2 restart behavior-processor-production
sleep 2
pm2 restart emotional-broadcaster
sleep 2
pm2 restart intervention-broadcaster

# Save PM2 state
pm2 save

# Check all logs
pm2 logs --lines 100
```

## 10. Debug Checklist
- [ ] All PM2 processes showing "online"
- [ ] Redis is running: `redis-cli ping` returns PONG
- [ ] Nginx is running: `sudo systemctl status nginx`
- [ ] WebSocket endpoints responding
- [ ] No errors in PM2 logs
- [ ] telemetry_events stream has data
- [ ] emotional_events channel has subscribers

## Common Issues & Fixes

### No events in Redis stream
```bash
# Check if gateway is receiving
pm2 logs telemetry-gateway | grep "Telemetry received"

# Check Redis is writable
redis-cli
> SET test "value"
> GET test
```

### Behavior processor not processing
```bash
# Check if reading from correct position
pm2 logs behavior-processor-production | grep "Processing event"

# Restart from beginning
pm2 restart behavior-processor-production
```

### WebSocket connection fails
```bash
# Check nginx config
cat /etc/nginx/conf.d/websocket.conf

# Check firewall
sudo iptables -L -n | grep 300
```

### High CPU/Memory usage
```bash
# Check PM2 status
pm2 monit

# Restart problematic service
pm2 restart [service-name]

# Clear Redis if overwhelmed
redis-cli
> FLUSHDB
```

## Monitoring Commands
```bash
# Watch all logs
watch -n 1 'pm2 list'

# Monitor Redis
redis-cli --stat

# Monitor system
htop

# Monitor network connections
ss -tunlp | grep 300
```