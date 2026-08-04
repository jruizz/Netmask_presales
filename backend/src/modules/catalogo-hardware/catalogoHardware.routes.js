import { Router } from 'express';
import { z } from 'zod';
import * as hardwareService from './catalogoHardware.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const catalogoHardwareRouter = Router();
catalogoHardwareRouter.use(authMiddleware);

const hardwareSchema = z.object({
  nombre: z.string().min(1),
  sku: z.string().optional(),
  numeroParte: z.string().optional(),
  descripcion: z.string().optional(),
  precio: z.number().nonnegative(),
  moneda: z.string().optional(),
  tecnologiaImplSugeridaId: z.number().int().positive().optional(),
});

catalogoHardwareRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await hardwareService.buscarHardware(req.query.q));
  } catch (err) {
    next(err);
  }
});

catalogoHardwareRouter.post('/', requirePermiso('crear'), async (req, res, next) => {
  try {
    const data = hardwareSchema.parse(req.body);
    res.status(201).json(await hardwareService.crearHardware(data, req.user.id));
  } catch (err) {
    next(err);
  }
});

catalogoHardwareRouter.put('/:id', requirePermiso('administrar_catalogos'), async (req, res, next) => {
  try {
    const data = hardwareSchema.parse(req.body);
    res.json(await hardwareService.actualizarHardware(req.params.id, data));
  } catch (err) {
    next(err);
  }
});

catalogoHardwareRouter.delete('/:id', requirePermiso('administrar_catalogos'), async (req, res, next) => {
  try {
    await hardwareService.eliminarHardware(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
