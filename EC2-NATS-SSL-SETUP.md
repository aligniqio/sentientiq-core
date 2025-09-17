# EC2 NATS SSL Setup Commands

## 1. SSH into EC2
```bash
ssh ec2-user@api.sentientiq.app
```

## 2. Edit nginx WebSocket config
```bash
sudo nano /etc/nginx/conf.d/websocket.conf
```

## 3. Add this location block (inside the existing server block):
```nginx
    # NATS WebSocket proxy
    location /ws/nats {
        proxy_pass http://localhost:9222;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;

        # Disable buffering for real-time
        proxy_buffering off;
        proxy_cache off;
    }
```

## 4. Test nginx config
```bash
sudo nginx -t
```

## 5. Reload nginx
```bash
sudo systemctl reload nginx
```

## 6. Test the connection
```bash
# Should connect successfully
wscat -c wss://api.sentientiq.app/ws/nats

# Once connected, you should see NATS protocol messages
```

## 7. Check if NATS is still running on 9222
```bash
# Check Docker NATS
docker ps | grep nats

# Check if port 9222 is listening
sudo netstat -tlnp | grep 9222
```

## If NATS isn't running:
```bash
# Start NATS with WebSocket support
docker run -d \
  --name nats \
  --restart unless-stopped \
  -p 4222:4222 \
  -p 8222:8222 \
  -p 9222:9222 \
  nats:latest \
  -js \
  --http_port 8222 \
  --ws \
  --ws_port 9222
```