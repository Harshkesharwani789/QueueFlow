import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { jobRouter } from './modules/jobs/job.routes.js';
import { metricsRouter } from './modules/metrics/metrics.routes.js';
import { queueRouter, workerRouter } from './modules/queues/queue.routes.js';

export const app = express();

// Security middleware is applied before routes so every API response gets the same protections.
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '100kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health', async (_req, res) => {
  const [database, cache] = await Promise.allSettled([prisma.$queryRaw`SELECT 1`, redis.ping()]);
  const healthy = database.status === 'fulfilled' && cache.status === 'fulfilled';
  res.status(healthy ? 200 : 503).json({ success: healthy, data: { api: 'ok', database: database.status, redis: cache.status } });
});

app.use('/api/auth', authRouter);
app.use('/api/jobs', jobRouter);
app.use('/api/queues', queueRouter);
app.use('/api/workers', workerRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup({ openapi: '3.0.3', info: { title: 'QueueFlow API', version: '1.0.0' }, paths: {} }));
app.use((_req, res) => res.status(404).json({ success: false, error: 'Route not found' }));
app.use(errorHandler);

// Exporting a factory-free app makes Supertest able to exercise routes without opening a TCP port.
export const settings = { port: env.PORT };
