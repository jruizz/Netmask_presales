import { Router } from 'express';
import { z } from 'zod';
import * as rolesService from './roles.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requireRole } from '../../middlewares/roleGuard.js';

export const rolesRouter = Router();
rolesRouter.use(authMiddleware);

const permisosSchema = z.object({ permisos: z.array(z.string()) });

rolesRouter.get('/', async (req, res, next) => {
  try {
    res.json(await rolesService.listRoles());
  } catch (err) {
    next(err);
  }
});

rolesRouter.get('/permisos-disponibles', async (req, res, next) => {
  try {
    res.json(await rolesService.listPermisos());
  } catch (err) {
    next(err);
  }
});

rolesRouter.put('/:id/permisos', requireRole('superadmin'), async (req, res, next) => {
  try {
    const { permisos } = permisosSchema.parse(req.body);
    await rolesService.actualizarPermisosRol(req.params.id, permisos);
    res.json(await rolesService.listRoles());
  } catch (err) {
    next(err);
  }
});
