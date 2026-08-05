import { Router } from 'express';
import { z } from 'zod';
import * as comercialesService from './comerciales.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const comercialesRouter = Router();
comercialesRouter.use(authMiddleware);

const comercialSchema = z.object({
  nombre: z.string().min(1),
  sector: z.enum(['OT', 'IT']),
});

comercialesRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await comercialesService.listComerciales());
  } catch (err) {
    next(err);
  }
});

comercialesRouter.post('/', requirePermiso('administrar_catalogos'), async (req, res, next) => {
  try {
    const data = comercialSchema.parse(req.body);
    res.status(201).json(await comercialesService.crearComercial(data));
  } catch (err) {
    next(err);
  }
});

comercialesRouter.put('/:id', requirePermiso('administrar_catalogos'), async (req, res, next) => {
  try {
    const data = comercialSchema.parse(req.body);
    res.json(await comercialesService.actualizarComercial(req.params.id, data));
  } catch (err) {
    next(err);
  }
});

comercialesRouter.delete('/:id', requirePermiso('administrar_catalogos'), async (req, res, next) => {
  try {
    await comercialesService.eliminarComercial(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
