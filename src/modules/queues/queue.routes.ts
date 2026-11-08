import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { ok } from '../../utils/response.js';
import { jobQueue } from './queue.service.js';
import { redis } from '../../config/redis.js';

export const queueRouter = Router();
queueRouter.use(authenticate, authorize('ADMIN'));
queueRouter.get('/', async (_req, res, next) => {
  try {
    const counts = await jobQueue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed');
    ok(res, { name: jobQueue.name, waiting: counts.wait, active: counts.active, completed: counts.completed, failed: counts.failed, delayed: counts.delayed });
  } catch (error) { next(error); }
});
export const workerRouter = Router();
workerRouter.use(authenticate, authorize('ADMIN'));
workerRouter.get('/', async (_req, res, next) => {
  try {
    const keys = await redis.keys('queueflow:worker:*');
    const rawWorkers = keys.length ? await redis.mget(keys) : [];
    const workers = rawWorkers.flatMap((raw) => {
      try { return raw ? [JSON.parse(raw) as { id: string; status: string; concurrency: number; activeJobs: number; lastHeartbeat: string }] : []; } catch { return []; }
    });
    ok(res, workers);
  } catch (error) { next(error); }
});
