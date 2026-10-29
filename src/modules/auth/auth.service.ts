import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

type PublicUser = { id: string; name: string; email: string; role: 'USER' | 'ADMIN'; createdAt: Date };

const publicUser = (user: PublicUser) => user; // Prisma select below deliberately excludes passwordHash.
const userFields = { id: true, name: true, email: true, role: true, createdAt: true } as const;

function tokenFor(user: { id: string; role: string }) {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] });
}

export const authService = {
  async register(input: { name: string; email: string; password: string }) {
    const exists = await prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new AppError(409, 'An account with this email already exists');
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash }, select: userFields });
    return { user: publicUser(user), token: tokenFor(user) };
  },
  async login(input: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
    }
    return { user: publicUser({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }), token: tokenFor(user) };
  },
  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: userFields });
    if (!user) throw new AppError(404, 'User not found');
    return publicUser(user);
  },
};
