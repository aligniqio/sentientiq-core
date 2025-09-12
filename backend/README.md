# SentientIQ Backend - NATS JetStream Infrastructure

## The Bloomberg Terminal of Emotional Intelligence™

### Architecture

```
detect.js → API → NATS JetStream → WebSocket → Browser
                        ↓
                  Persistence (7 days)
                        ↓
              Emotional Volatility Index™
```

### Quick Start

1. **Start NATS JetStream:**
```bash
docker-compose up -d
# or
npm run nats
```

2. **Start Emotional API:**
```bash
npm run start:emotional
# or for development
npm run dev:emotional
```

### Services

- **NATS JetStream** (port 4222): Message persistence and horizontal scaling
- **WebSocket Server** (port 8080): Real-time browser connections
- **HTTP API** (port 3001): Event ingestion and polling fallback

### Key Features

- **Persistent Event Stream**: 7-day retention with JetStream
- **Horizontal Scaling**: Queue groups for multiple consumers
- **Emotional Volatility Index™**: Real-time calculation
- **Smart Fallback**: WebSocket → Polling graceful degradation
- **ETag Caching**: Efficient polling when WebSocket unavailable

### Environment Variables

```env
NATS_URL=nats://localhost:4222
WS_PORT=8080
PORT=3001
```

### Monitoring

- NATS Dashboard: http://localhost:8222
- Health Check: http://localhost:3001/health

### Data Moat

Every emotional event contributes to our proprietary Emotional Volatility Index™, creating an insurmountable competitive advantage through aggregated behavioral intelligence.