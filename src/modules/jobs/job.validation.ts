import { z } from 'zod';

const priority = z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']);
const id = z.string().cuid();
const empty = z.object({});

export const createJobSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(160),
    type: z.enum(['email', 'report', 'notification', 'default']),
    payload: z.record(z.unknown()).default({}),
    priority: priority.default('NORMAL'),
    maxAttempts: z.number().int().min(1).max(10).default(3),
    scheduledAt: z.coerce.date().optional(),
  }).superRefine((job, ctx) => {
    if (job.scheduledAt && job.scheduledAt <= new Date()) ctx.addIssue({ code: 'custom', message: 'scheduledAt must be in the future', path: ['scheduledAt'] });
  }),
  query: empty,
  params: empty,
});

export const idSchema = z.object({ body: empty, query: empty, params: z.object({ id }) });
export const listJobsSchema = z.object({
  body: empty,
  params: empty,
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'CANCELLED']).optional(),
    priority: priority.optional(),
    type: z.enum(['email', 'report', 'notification', 'default']).optional(),
  }),
});
