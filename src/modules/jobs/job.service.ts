import type { JobStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { AppError } from '../../utils/errors.js';
import { enqueue, jobQueue } from '../queues/queue.service.js';

const allowedCancel: JobStatus[] = ['PENDING', 'QUEUED', 'RETRYING'];

// Ownership is centralized so every mutation enforces the same user boundary.
async function ownedJob(id: string, userId: string, admin = false) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new AppError(404, 'Job not found');
  if (!admin && job.userId !== userId) throw new AppError(403, 'You do not own this job');
  return job;
}

export const jobService = {
  async create(userId: string, input: { name: string; type: string; payload: Record<string, unknown>; priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'; maxAttempts: number; scheduledAt?: Date }) {
    // Persist first to obtain the canonical ID, then make queue failure visible in the database.
    const job = await prisma.job.create({ data: { ...input, userId, payload: input.payload as Prisma.InputJsonValue } });
    try {
      await enqueue({ applicationJobId: job.id, type: job.type, payload: input.payload }, job.priority, job.maxAttempts, job.scheduledAt);
      return await prisma.job.update({ where: { id: job.id }, data: { status: 'QUEUED' } });
    } catch (error) {
      await prisma.job.update({ where: { id: job.id }, data: { status: 'FAILED', failedAt: new Date(), lastError: 'Queue submission failed' } });
      await prisma.jobLog.create({ data: { jobId: job.id, level: 'ERROR', message: 'Queue submission failed', metadata: { cause: error instanceof Error ? error.message : 'Unknown error' } } });
      throw new AppError(503, 'Job was saved but could not be queued; it is marked failed and can be retried');
    }
  },
  async list(userId: string, admin: boolean, query: { page: number; limit: number; status?: JobStatus; priority?: Prisma.JobWhereInput['priority']; type?: string }) {
    const where: Prisma.JobWhereInput = { ...(admin ? {} : { userId }), ...(query.status ? { status: query.status } : {}), ...(query.priority ? { priority: query.priority } : {}), ...(query.type ? { type: query.type } : {}) };
    const [items, total] = await prisma.$transaction([
      prisma.job.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
      prisma.job.count({ where }),
    ]);
    return { items, page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) };
  },
  async detail(id: string, userId: string, admin: boolean) {
    await ownedJob(id, userId, admin);
    return prisma.job.findUniqueOrThrow({ where: { id }, include: { attemptsLog: { orderBy: { attemptNumber: 'asc' } }, logs: { orderBy: { createdAt: 'asc' } } } });
  },
  async cancel(id: string, userId: string, admin: boolean) {
    const job = await ownedJob(id, userId, admin);
    if (!allowedCancel.includes(job.status)) throw new AppError(409, `A ${job.status} job cannot be cancelled`);
    const queueJob = await jobQueue.getJob(id);
    if (queueJob) await queueJob.remove(); // Removes delayed/waiting work before committing cancellation.
    return prisma.job.update({ where: { id }, data: { status: 'CANCELLED' } });
  },
  async retry(id: string, userId: string, admin: boolean) {
    const job = await ownedJob(id, userId, admin);
    if (job.status !== 'FAILED') throw new AppError(409, 'Only failed jobs can be retried');
    const previous = await jobQueue.getJob(id);
    if (previous) await previous.remove();
    await enqueue({ applicationJobId: job.id, type: job.type, payload: job.payload as Record<string, unknown> }, job.priority, job.maxAttempts);
    return prisma.job.update({ where: { id }, data: { status: 'QUEUED', attempts: 0, lastError: null, failedAt: null } });
  },
  async remove(id: string, userId: string, admin: boolean) {
    const job = await ownedJob(id, userId, admin);
    if (job.status === 'PROCESSING') throw new AppError(409, 'An executing job cannot be deleted');
    const queueJob = await jobQueue.getJob(id);
    if (queueJob) await queueJob.remove();
    await prisma.job.delete({ where: { id } });
  },
};
