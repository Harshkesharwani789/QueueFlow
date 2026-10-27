import 'dotenv/config';
import { z } from 'zod';

// Validate configuration once at startup so a misconfigured deployment fails early.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  RETRY_BACKOFF_MS: z.coerce.number().int().positive().default(1000),
});

export const env = schema.parse(process.env);
