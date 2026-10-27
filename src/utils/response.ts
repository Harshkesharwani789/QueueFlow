import type { Response } from 'express';

// Keep all successful responses predictable for clients and frontend code.
export const ok = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ success: true, data });
