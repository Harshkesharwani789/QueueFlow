import { Queue } from 'bullmq';
import { redis } from '../../config/redis.js';
import { env } from '../../config/env.js';
import { priorityValue } from './priorities.js';

export const QUEUE_NAME = 'queueflow-jobs';

export { priorityValue } from './priorities.js';

export type QueuePayload = { applicationJobId: string; type: string; payload: Record<string, unknown> };
export const jobQueue = new Queue<QueuePayload>(QUEUE_NAME, { connection: redis });

export async function enqueue(payload: QueuePayload, priority: keyof typeof priorityValue, maxAttempts: number, scheduledAt?: Date | null) {
  const delay = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;
  return jobQueue.add(payload.type, payload, {
    jobId: payload.applicationJobId, // One application ID maps deterministically to one BullMQ ID.
    priority: priorityValue[priority],
    attempts: maxAttempts,
    backoff: { type: 'exponential', delay: env.RETRY_BACKOFF_MS },
    delay,
    removeOnComplete: { age: 86_400, count: 1_000 },
    removeOnFail: false,
  });
}
