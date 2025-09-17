#!/bin/bash
# Fix nginx WebSocket proxy configuration

# Create a new configuration with WebSocket locations at the top
cat << 'EOF' | sudo tee /etc/nginx/conf.d/sentientiq-websocket.conf
server {
    listen 443 ssl http2;
    server_name api.sentientiq.app;

    ssl_certificate /etc/letsencrypt/live/api.sentientiq.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sentientiq.app/privkey.pem;

    # WebSocket proxies - MUST BE FIRST for priority

    # Telemetry Gateway WebSocket proxy
    location /ws/telemetry {
        proxy_pass http://localhost:3002/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    # Emotional Broadcaster WebSocket proxy
    location /ws/emotions {
        proxy_pass http://localhost:3003/ws/emotions;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    # Intervention Broadcaster WebSocket proxy
    location /ws/interventions {
        proxy_pass http://localhost:3004/ws/interventions;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffering off;
    }

    # Include the rest of the config
    include /etc/nginx/conf.d/sentientiq-main.conf;
}
EOF

# Move the existing config (minus server block wrapper) to be included
sudo sed '1d;$d' /etc/nginx/conf.d/sentientiq.conf > /tmp/sentientiq-main.conf
sudo mv /tmp/sentientiq-main.conf /etc/nginx/conf.d/sentientiq-main.conf

# Disable the old config
sudo mv /etc/nginx/conf.d/sentientiq.conf /etc/nginx/conf.d/sentientiq.conf.disabled

# Test the configuration
sudo nginx -t

# If successful, reload nginx
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "Nginx configuration updated successfully!"
else
    echo "Configuration test failed, reverting..."
    sudo mv /etc/nginx/conf.d/sentientiq.conf.disabled /etc/nginx/conf.d/sentientiq.conf
    sudo rm /etc/nginx/conf.d/sentientiq-websocket.conf
    sudo rm /etc/nginx/conf.d/sentientiq-main.conf
fi