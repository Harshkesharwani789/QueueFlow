import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

// Zod strips unknown fields, preventing mass assignment from request bodies.
export const validate = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
  if (!result.success) return next(result.error);
  // Express 5 exposes query as a getter, so retain parsed values in our own request property.
  req.validated = result.data;
  req.body = result.data.body;
  next();
};
