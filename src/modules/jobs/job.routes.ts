import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/response.js';
import { createJobSchema, idSchema, listJobsSchema } from './job.validation.js';
import { jobService } from './job.service.js';

export const jobRouter = Router();
jobRouter.use(authenticate);
type ListQuery = { page: number; limit: number; status?: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'CANCELLED'; priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'; type?: string };
const validatedId = (req: { validated?: { params: unknown } }) => (req.validated!.params as { id: string }).id;

// Route handlers only translate HTTP to service calls; business decisions live in job.service.ts.
jobRouter.post('/', validate(createJobSchema), async (req, res, next) => {
  try { ok(res, await jobService.create(req.user!.id, req.body), 201); } catch (error) { next(error); }
});
jobRouter.get('/', validate(listJobsSchema), async (req, res, next) => {
  try { ok(res, await jobService.list(req.user!.id, req.user!.role === 'ADMIN', req.validated!.query as ListQuery)); } catch (error) { next(error); }
});
jobRouter.get('/:id', validate(idSchema), async (req, res, next) => {
  try { ok(res, await jobService.detail(validatedId(req), req.user!.id, req.user!.role === 'ADMIN')); } catch (error) { next(error); }
});
jobRouter.post('/:id/retry', validate(idSchema), async (req, res, next) => {
  try { ok(res, await jobService.retry(validatedId(req), req.user!.id, req.user!.role === 'ADMIN')); } catch (error) { next(error); }
});
jobRouter.post('/:id/cancel', validate(idSchema), async (req, res, next) => {
  try { ok(res, await jobService.cancel(validatedId(req), req.user!.id, req.user!.role === 'ADMIN')); } catch (error) { next(error); }
});
jobRouter.delete('/:id', validate(idSchema), async (req, res, next) => {
  try { await jobService.remove(validatedId(req), req.user!.id, req.user!.role === 'ADMIN'); res.status(204).send(); } catch (error) { next(error); }
});
