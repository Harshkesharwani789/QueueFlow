import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { ok } from '../../utils/response.js';
import { authService } from './auth.service.js';
import { loginSchema, registerSchema } from './auth.validation.js';

export const authRouter = Router();

authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try { ok(res, await authService.register(req.body), 201); } catch (error) { next(error); }
});
authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try { ok(res, await authService.login(req.body)); } catch (error) { next(error); }
});
authRouter.get('/me', authenticate, async (req, res, next) => {
  try { ok(res, await authService.me(req.user!.id)); } catch (error) { next(error); }
});
