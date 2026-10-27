import { pino } from 'pino';
import { env } from '../config/env.js';

// Structured logs are machine-readable in production and include a timestamp by default.
export const logger = pino({ level: env.NODE_ENV === 'production' ? 'info' : 'debug' });
