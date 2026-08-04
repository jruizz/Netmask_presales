import { Router } from 'express';
import { z } from 'zod';
import * as especificacionesService from '../especificaciones/especificaciones.service.js';
import * as bomsService from './boms.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso, requireRole } from '../../middlewares/roleGuard.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const especificacionRouter = Router({ mergeParams: true });
especificacionRouter.use(authMiddleware);

const especificacionSchema = z.object({
  tipoServicioId: z.number().int().positive(),
  datosWizard: z.record(z.any()).default({}),
});
const comentarioSchema = z.object({ comentario: z.string().optional() });

async function assertBomAccess(req) {
  await bomsService.getBom(req.params.bomId, req.user);
}

especificacionRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const especificacion = await especificacionesService.getEspecificacion(req.params.bomId);
    if (!especificacion) throw new HttpError(404, 'Este BOM no tiene componente de Servicios Netmask configurado');
    res.json(especificacion);
  } catch (err) {
    next(err);
  }
});

especificacionRouter.put('/', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const data = especificacionSchema.parse(req.body);
    res.json(await especificacionesService.upsertEspecificacion(req.params.bomId, data, req.user.id));
  } catch (err) {
    next(err);
  }
});

especificacionRouter.delete('/', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    await especificacionesService.eliminarEspecificacion(req.params.bomId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

especificacionRouter.post('/enviar-revision-lider', requireRole('ingenieria', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.json(await especificacionesService.enviarRevisionLider(req.params.bomId, req.user.id));
  } catch (err) {
    next(err);
  }
});

especificacionRouter.post('/aprobar-lider', requireRole('lider_tecnico', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const { comentario } = comentarioSchema.parse(req.body);
    res.json(await especificacionesService.aprobarLider(req.params.bomId, req.user.id, comentario));
  } catch (err) {
    next(err);
  }
});

especificacionRouter.post('/enviar-revision-gerencia', requireRole('lider_tecnico', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.json(await especificacionesService.enviarRevisionGerencia(req.params.bomId, req.user.id));
  } catch (err) {
    next(err);
  }
});

especificacionRouter.post('/aprobar-gerencia', requireRole('gerencia', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const { comentario } = comentarioSchema.parse(req.body);
    res.json(await especificacionesService.aprobarGerencia(req.params.bomId, req.user.id, comentario));
  } catch (err) {
    next(err);
  }
});

especificacionRouter.post('/rechazar', requireRole('lider_tecnico', 'gerencia', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const { comentario } = comentarioSchema.parse(req.body);
    res.json(await especificacionesService.rechazar(req.params.bomId, req.user.id, comentario));
  } catch (err) {
    next(err);
  }
});

especificacionRouter.post('/marcar-generado', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.json(await especificacionesService.marcarGenerado(req.params.bomId, req.user.id));
  } catch (err) {
    next(err);
  }
});
