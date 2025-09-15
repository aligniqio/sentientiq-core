# Orchestrator Services

## Active Services (In Use)
- **unified-websocket.js** - WebSocket server for real-time emotion/intervention delivery
- **pattern-engine.ts** - Pattern matching engine for intervention triggers
- **behavior-processor.js** - Converts raw telemetry behaviors into emotional diagnoses

## Future Scale Services (Kept for Later)
- **accountability-engine.ts** - Enterprise feature for team accountability
- **crm-integration.ts** - CRM integration capabilities
- **deal-intelligence.ts** - Sales intelligence features
- **event-lake.ts** - Data warehouse for analytics
- **evi-calculator.ts** - Complex EVI (Emotional Volatility Index) calculations
- **evi-queries.ts** - EVI query operations
- **executive-alerts.ts** - Executive dashboard alerts
- **identity-resolution.ts** - Identity management across sessions
- **intervention-engine.ts** - Original intervention system (kept for reference)
- **pipeline-stubs.ts** - Stub functions for future pipeline
- **sage-stream.ts** - Sonic 3.5 wrapper for implementation/setup help
- **webhook-dispatcher.ts** - Webhook integration for Slack/email/CRM

## Archived Services
Files moved to `_archived_2025_01_15/`:
- emotion-physics.ts (visualization)
- emotional-analytics.ts (analytics dashboard)
- emotional-learning.ts (ML features)
- recommendations-engine.ts (recommendation system)
- revenue-forensics.ts (revenue analytics)
- websocket-manager.ts (replaced by unified-websocket)
- tenant-interventions.ts (over-engineered multi-tenant)
- tenant-router.ts (over-engineered routing)

## Architecture Notes
The clean architecture uses only the active services. The hybrid approach:
1. **Telemetry** (frontend) sends raw behaviors
2. **behavior-processor** diagnoses emotions from behaviors
3. **pattern-engine** detects intervention patterns
4. **unified-websocket** delivers interventions in real-time

For scale, additional services can be activated as needed.