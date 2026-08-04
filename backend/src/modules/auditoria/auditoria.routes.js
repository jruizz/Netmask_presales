import { Router } from 'express';
import * as auditoriaService from './auditoria.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const auditoriaRouter = Router();
auditoriaRouter.use(authMiddleware, requirePermiso('ver_auditoria'));

auditoriaRouter.get('/', async (req, res, next) => {
  try {
    const { entidadTipo, usuarioId, limit } = req.query;
    res.json(await auditoriaService.listarAuditoria({ entidadTipo, usuarioId, limit }));
  } catch (err) {
    next(err);
  }
});
