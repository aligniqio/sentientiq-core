// worker.ts
import 'dotenv/config';
import { startWorker } from './queue/worker';

console.log('🚀 Starting debate worker...');
startWorker(process.env.WORKER_NAME || `w-${Math.random().toString(36).slice(2,6)}`)
  .catch(err => {
    console.error('Worker failed:', err);
    process.exit(1);
  });