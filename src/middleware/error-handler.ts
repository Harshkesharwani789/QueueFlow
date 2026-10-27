import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Translate operational errors to a stable JSON contract and hide internal details.
export const errorHandler: ErrorRequestHandler = (err, _req, res) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ success: false, error: 'Validation failed', details: err.flatten() });
  }
  if (err instanceof AppError) return res.status(err.statusCode).json({ success: false, error: err.message });
  logger.error(err, 'Unhandled request error');
  return res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
