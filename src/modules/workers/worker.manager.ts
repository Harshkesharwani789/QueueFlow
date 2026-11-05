import { Worker, type Job } from 'bullmq';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { QUEUE_NAME, type QueuePayload } from '../queues/queue.service.js';
import { processJob } from './processors.js';

export const workerId = `worker-${process.pid}`;
const heartbeatKey = `queueflow:worker:${workerId}`;
const activeJobIds = new Set<string>();

// Redis TTL lets stale worker entries disappear automatically after an unclean shutdown.
export async function writeHeartbeat() {
  await redis.set(heartbeatKey, JSON.stringify({ id: workerId, status: 'ready', concurrency: env.WORKER_CONCURRENCY, activeJobs: activeJobIds.size, lastHeartbeat: new Date().toISOString() }), 'EX', 20);
}

async function recordLog(jobId: string, level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata?: object) {
  await prisma.jobLog.create({ data: { jobId, level, message, metadata } });
}

// This is the only execution path: BullMQ owns retry scheduling and this handler mirrors its state in PostgreSQL.
async function handle(job: Job<QueuePayload>) {
  const id = job.data.applicationJobId;
  const attemptNumber = job.attemptsMade + 1;
  const dbJob = await prisma.job.findUnique({ where: { id } });
  if (!dbJob || dbJob.status === 'CANCELLED') return { skipped: true };
  await prisma.$transaction([
    prisma.job.update({ where: { id }, data: { status: 'PROCESSING', startedAt: new Date(), attempts: attemptNumber } }),
    prisma.jobAttempt.upsert({ where: { jobId_attemptNumber: { jobId: id, attemptNumber } }, create: { jobId: id, attemptNumber, status: 'PROCESSING' }, update: { status: 'PROCESSING', startedAt: new Date(), completedAt: null, error: null } }),
  ]);
  activeJobIds.add(id);
  await recordLog(id, 'INFO', 'Worker started job', { workerId, attemptNumber });
  try {
    const result = await processJob(job.data.type, job.data.payload);
    await prisma.$transaction([
      prisma.job.update({ where: { id }, data: { status: 'COMPLETED', completedAt: new Date(), lastError: null } }),
      prisma.jobAttempt.update({ where: { jobId_attemptNumber: { jobId: id, attemptNumber } }, data: { status: 'COMPLETED', completedAt: new Date() } }),
    ]);
    await recordLog(id, 'INFO', 'Worker completed job', { workerId, result });
    activeJobIds.delete(id);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error';
    const finalAttempt = attemptNumber >= (job.opts.attempts ?? 1);
    await prisma.$transaction([
      prisma.job.update({ where: { id }, data: { status: finalAttempt ? 'FAILED' : 'RETRYING', lastError: message, ...(finalAttempt ? { failedAt: new Date() } : {}) } }),
      prisma.jobAttempt.update({ where: { jobId_attemptNumber: { jobId: id, attemptNumber } }, data: { status: 'FAILED', completedAt: new Date(), error: message } }),
    ]);
    await recordLog(id, 'ERROR', finalAttempt ? 'Job failed permanently' : 'Job failed; BullMQ will retry', { workerId, attemptNumber, message });
    activeJobIds.delete(id);
    throw error; // Re-throwing tells BullMQ to apply its configured exponential backoff.
  }
}

export function createWorker() {
  const worker = new Worker<QueuePayload>(QUEUE_NAME, handle, { connection: redis.duplicate(), concurrency: env.WORKER_CONCURRENCY });
  worker.on('error', (error) => logger.error(error, 'BullMQ worker error'));
  worker.on('ready', () => { void writeHeartbeat(); logger.info({ workerId, concurrency: env.WORKER_CONCURRENCY }, 'Worker is ready'); });
  return worker;
}
