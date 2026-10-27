import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

// Decode the bearer token once and attach only the authorization facts routes need.
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'Authentication token is required'));
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: 'USER' | 'ADMIN' };
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'Authentication token is invalid or expired'));
  }
}

// Role checks run after authenticate, keeping administrative endpoints explicit.
export const authorize = (...roles: Array<'USER' | 'ADMIN'>) =>
  (req: Request, _res: Response, next: NextFunction) =>
    req.user && roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, 'You are not allowed to perform this action'));
