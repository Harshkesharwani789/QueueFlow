import { app, settings } from './app.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { logger } from './utils/logger.js';

const server = app.listen(settings.port, () => logger.info({ port: settings.port }, 'QueueFlow API listening'));

// Stop accepting new requests before closing database and Redis connections.
async function shutdown(signal: string) {
  logger.info({ signal }, 'API shutting down');
  server.close(async () => { await Promise.all([prisma.$disconnect(), redis.quit()]); process.exit(0); });
}
process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
process.once('SIGINT', () => { void shutdown('SIGINT'); });
