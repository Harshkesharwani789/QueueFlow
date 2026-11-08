import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { createWorker, writeHeartbeat } from './modules/workers/worker.manager.js';
import { logger } from './utils/logger.js';

const worker = createWorker();
const heartbeat = setInterval(() => { void writeHeartbeat(); }, 10_000);
async function shutdown(signal: string) {
  logger.info({ signal }, 'Worker shutting down');
  clearInterval(heartbeat);
  await worker.close(); // Worker.close waits for active handlers so work is not abandoned.
  await Promise.all([prisma.$disconnect(), redis.quit()]);
  process.exit(0);
}
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
process.once('SIGINT', () => { void shutdown('SIGINT'); });
