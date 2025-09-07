#!/bin/bash

echo "🚀 COMPLETE SENTIENTIQ ORCHESTRATOR SETUP"
echo "=========================================="
echo ""
echo "📋 DNS SETUP NEEDED (Manual - Netlify Dashboard):"
echo "1. Go to: https://app.netlify.com/teams/sentientiq-dev/dns"
echo "2. Click on sentientiq.app domain"
echo "3. Add DNS record:"
echo "   - Type: A"
echo "   - Name: api"
echo "   - Value: 98.87.12.130"
echo "   - TTL: 300"
echo ""
echo "Press Enter once DNS is added..."
read

echo "⏳ Waiting for DNS to propagate (checking every 30s)..."
while ! nslookup api.sentientiq.app 8.8.8.8 | grep -q "98.87.12.130"; do
  echo "   Still waiting for DNS..."
  sleep 30
done
echo "✅ DNS is live!"

echo ""
echo "🔐 Now SSH to EC2 and run these commands:"
echo ""
cat << 'EOF'
# SSH to server
ssh -i /Users/matthewkiselstein/projects/sentientiq-core/.ssh/collective-backend.pem ec2-user@98.87.12.130

# Once connected, run:
sudo certbot --nginx -d api.sentientiq.app --redirect --agree-tos -m matt@sentientiq.ai
sudo nginx -t && sudo systemctl reload nginx

# Test it works
curl https://api.sentientiq.app/health
EOF

echo ""
echo "📱 Then test from your app console at https://sentientiq.app:"
echo ""
cat << 'EOF'
// Final test - paste in console
fetch('https://api.sentientiq.app/v1/boardroom', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ 
    prompt: 'How do we reduce checkout anxiety?', 
    topK: 3 
  })
})
.then(r => r.body.getReader())
.then(reader => {
  const decoder = new TextDecoder();
  function read() {
    reader.read().then(({done, value}) => {
      if (done) return;
      console.log(decoder.decode(value));
      read();
    });
  }
  read();
});
EOF

echo ""
echo "🎉 YOUR EMOTIONAL INTELLIGENCE ENGINE IS READY!"
echo "No Math.Random(), No surveillance, Just real understanding!"
echo ""
echo "Enjoy your dinner - you've earned it! 🍽️"