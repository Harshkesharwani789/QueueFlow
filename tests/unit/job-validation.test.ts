import { describe, expect, it } from 'vitest';
import { createJobSchema } from '../../src/modules/jobs/job.validation.js';

describe('job request validation', () => {
  const base = { name: 'Welcome', type: 'email', payload: { to: 'a@example.com', subject: 'Hi', message: 'Welcome' } };
  it('uses safe defaults for omitted scheduling and retries', () => {
    const parsed = createJobSchema.parse({ body: base, query: {}, params: {} });
    expect(parsed.body).toMatchObject({ priority: 'NORMAL', maxAttempts: 3 });
  });
  it('rejects a scheduled time in the past', () => {
    expect(() => createJobSchema.parse({ body: { ...base, scheduledAt: new Date(Date.now() - 1_000) }, query: {}, params: {} })).toThrow();
  });
});
