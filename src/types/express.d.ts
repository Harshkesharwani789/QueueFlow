import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
      // Validation output is separate from Express's read-only query/params accessors.
      validated?: { body: unknown; query: unknown; params: unknown };
    }
  }
}

export {};
