import { z } from 'zod';

const credentials = z.object({
  email: z.string().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(72), // bcrypt only uses the first 72 bytes.
});

export const registerSchema = z.object({ body: credentials.extend({ name: z.string().trim().min(2).max(100) }), query: z.object({}), params: z.object({}) });
export const loginSchema = z.object({ body: credentials, query: z.object({}), params: z.object({}) });
