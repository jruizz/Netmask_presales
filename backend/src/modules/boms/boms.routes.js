import { Router } from 'express';
import { z } from 'zod';
import * as bomsService from './boms.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso, requireRole } from '../../middlewares/roleGuard.js';

export const bomsRouter = Router();
bomsRouter.use(authMiddleware);

const crearBomSchema = z.object({
  clienteId: z.number().int().positive(),
  nombre: z.string().min(1),
  comercialId: z.number().int().positive(),
  ubicacionProyecto: z.string().min(1),
});

bomsRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    const mine = req.query.mine === 'true';
    res.json(await bomsService.listBoms(req.user, { mine }));
  } catch (err) {
    next(err);
  }
});

bomsRouter.post('/', requirePermiso('crear'), async (req, res, next) => {
  try {
    const data = crearBomSchema.parse(req.body);
    res.status(201).json(await bomsService.crearBom(data, req.user.id));
  } catch (err) {
    next(err);
  }
});

bomsRouter.get('/:id', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await bomsService.getBom(req.params.id, req.user));
  } catch (err) {
    next(err);
  }
});

bomsRouter.delete('/:id', requireRole('superadmin'), async (req, res, next) => {
  try {
    await bomsService.eliminarBom(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
