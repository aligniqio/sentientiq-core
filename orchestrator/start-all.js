/**
 * SentientIQ Complete Stack Startup
 * Starts orchestrator + telemetry gateway
 */

require('dotenv').config();

// Start the main orchestrator
require('./src/server-clean.js');

// Start the telemetry gateway
const TelemetryGateway = require('./src/services/telemetry-gateway.js');
const gateway = new TelemetryGateway();
gateway.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down SentientIQ stack...');
  await gateway.shutdown();
  process.exit(0);
});

console.log(`
╔══════════════════════════════════════════════╗
║   SentientIQ Complete Stack                 ║
╠══════════════════════════════════════════════╣
║   ✓ Orchestrator: Port 3001                 ║
║   ✓ Telemetry Gateway: Port 3002            ║
║   ✓ Redis: Connected                        ║
║   ✓ Supabase: Connected                     ║
╚══════════════════════════════════════════════╝
`);