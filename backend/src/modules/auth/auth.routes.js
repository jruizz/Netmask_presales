import { Router } from 'express';
import { z } from 'zod';
import * as authService from './auth.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';

export const authRouter = Router();

const loginSchema = z.object({
  correo: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { correo, password } = loginSchema.parse(req.body);
    const result = await authService.login(correo, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const me = await authService.getMe(req.user.id);
    res.json(me);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', authMiddleware, (req, res) => {
  res.json({ ok: true });
});
