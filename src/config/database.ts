import { PrismaClient } from '@prisma/client';

// A single Prisma client prevents excess PostgreSQL connection pools per process.
export const prisma = new PrismaClient();
