import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate, authorize } from '../../middleware/authenticate.js';
import { ok } from '../../utils/response.js';
import { jobQueue } from '../queues/queue.service.js';

export const metricsRouter = Router();
metricsRouter.use(authenticate, authorize('ADMIN'));
metricsRouter.get('/', async (_req, res, next) => {
  try {
    const grouped = await prisma.job.groupBy({ by: ['status'], _count: { _all: true } });
    const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
    const total = await prisma.job.count();
    // PostgreSQL duration aggregation is deliberately calculated in service code to remain Prisma-portable.
    const completedJobs = await prisma.job.findMany({ where: { status: 'COMPLETED', startedAt: { not: null }, completedAt: { not: null } }, select: { startedAt: true, completedAt: true } });
    const averageExecutionMs = completedJobs.length ? completedJobs.reduce((sum, job) => sum + (job.completedAt!.getTime() - job.startedAt!.getTime()), 0) / completedJobs.length : 0;
    const completed = counts.COMPLETED ?? 0;
    const failed = counts.FAILED ?? 0;
    const terminal = completed + failed;
    ok(res, { totalJobs: total, counts, averageExecutionMs, successRate: terminal ? completed / terminal : 0, failureRate: terminal ? failed / terminal : 0, queue: await jobQueue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed') });
  } catch (error) { next(error); }
});
