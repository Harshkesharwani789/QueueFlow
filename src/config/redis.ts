import { Redis } from 'ioredis';
import { env } from './env.js';

// BullMQ requires retries to stay enabled on this low-level Redis connection.
export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
