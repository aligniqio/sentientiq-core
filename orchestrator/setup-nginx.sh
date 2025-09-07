#!/bin/bash

echo "🔒 HARDENING SENTIENTIQ API WITH NGINX + SSL"
echo "============================================"

# Install nginx
echo "Installing nginx..."
sudo dnf install -y nginx
sudo systemctl enable --now nginx

# Create nginx config
echo "Creating nginx configuration..."
sudo tee /etc/nginx/conf.d/api-sentientiq.conf << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=boardroom_limit:10m rate=2r/s;

server {
  listen 80;
  server_name api.sentientiq.app;
  
  # Force HTTPS
  location / {
    return 301 https://$host$request_uri;
  }
}

server {
  listen 443 ssl http2;
  server_name api.sentientiq.app;

  # SSL (Certbot will add these)
  # ssl_certificate /etc/letsencrypt/live/api.sentientiq.app/fullchain.pem;
  # ssl_certificate_key /etc/letsencrypt/live/api.sentientiq.app/privkey.pem;

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-XSS-Protection "1; mode=block" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # CORS headers for your app domain
  add_header Access-Control-Allow-Origin "https://app.sentientiq.ai" always;
  add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
  add_header Access-Control-Allow-Headers "Content-Type" always;

  # Health check - no rate limit
  location /health {
    proxy_pass http://127.0.0.1:8787;
  }

  # Boardroom - stricter rate limit (expensive)
  location /v1/boardroom {
    limit_req zone=boardroom_limit burst=5 nodelay;
    
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Connection "";
    
    # SSE specific
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    chunked_transfer_encoding on;
  }

  # Other endpoints - standard rate limit
  location / {
    limit_req zone=api_limit burst=20 nodelay;
    
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Connection "";
    
    # SSE specific
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }
}
EOF

# Test nginx config
echo "Testing nginx configuration..."
sudo nginx -t

# Install certbot
echo "Installing certbot..."
sudo dnf install -y python3-certbot-nginx

echo ""
echo "============================================"
echo "✅ NGINX INSTALLED AND CONFIGURED"
echo ""
echo "Next steps:"
echo "1. Point api.sentientiq.app DNS to: 98.87.12.130"
echo "2. Run certbot for SSL:"
echo "   sudo certbot --nginx -d api.sentientiq.app --redirect --agree-tos -m your@email.com"
echo "3. Reload nginx:"
echo "   sudo systemctl reload nginx"
echo ""
echo "Your API will be available at:"
echo "   https://api.sentientiq.app/health"
echo "   https://api.sentientiq.app/v1/debate"
echo "   https://api.sentientiq.app/v1/boardroom"
echo ""
echo "Rate limits:"
echo "   - Boardroom: 2 req/sec (expensive!)"
echo "   - Other endpoints: 10 req/sec"
echo "============================================"