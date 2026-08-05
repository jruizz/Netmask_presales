import { Router } from 'express';
import { z } from 'zod';
import * as hardwareItemsService from './hardwareItems.service.js';
import * as bomsService from './boms.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const hardwareItemsRouter = Router({ mergeParams: true });
hardwareItemsRouter.use(authMiddleware);

const agregarSchema = z.object({
  hardwareId: z.number().int().positive(),
  cantidad: z.number().int().positive().default(1),
});
const actualizarSchema = z.object({ cantidad: z.number().int().positive() });

async function assertBomAccess(req) {
  await bomsService.getBom(req.params.bomId, req.user);
}

hardwareItemsRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.json(await hardwareItemsService.listHardwareItems(req.params.bomId));
  } catch (err) {
    next(err);
  }
});

hardwareItemsRouter.post('/', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const data = agregarSchema.parse(req.body);
    res.status(201).json(await hardwareItemsService.agregarHardwareItem(req.params.bomId, data));
  } catch (err) {
    next(err);
  }
});

hardwareItemsRouter.put('/:itemId', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const data = actualizarSchema.parse(req.body);
    res.json(await hardwareItemsService.actualizarHardwareItem(req.params.bomId, req.params.itemId, data));
  } catch (err) {
    next(err);
  }
});

hardwareItemsRouter.delete('/:itemId', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    await hardwareItemsService.eliminarHardwareItem(req.params.bomId, req.params.itemId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
