import { Router } from 'express';
import { z } from 'zod';
import * as cotizacionService from '../cotizaciones/cotizacionImpl.service.js';
import * as bomsService from './boms.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso, requireRole } from '../../middlewares/roleGuard.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export const cotizacionImplRouter = Router({ mergeParams: true });
cotizacionImplRouter.use(authMiddleware);

const sedeSchema = z.object({
  nombre: z.string().min(1),
  ingenieros: z.number().int().positive(),
  dias: z.number().int().nonnegative(),
  alimentacionDia: z.number().nonnegative(),
  hospedajeDia: z.number().nonnegative(),
  transporteInternoDia: z.number().nonnegative(),
  transporteAeropuerto: z.number().nonnegative(),
  vuelo: z.number().nonnegative(),
  esLocal: z.boolean().default(false),
});

const cotizacionSchema = z.object({
  modo: z.enum(['epsp', 'netmask']),
  nivelIngenieria: z.number().int().min(1).max(3).default(2),
  condicion: z.enum(['interno', 'aliado']).default('interno'),
  numeroPlantas: z.number().int().positive().default(1),
  trm: z.number().positive().optional(),
  bolsaHorasActiva: z.boolean().default(false),
  siteSurveyActivo: z.boolean().default(false),
  requiereAprobacion: z.boolean().default(false),
  sedes: z.array(sedeSchema).default([]),
  tecnologiasSeleccionadas: z.array(z.object({
    tecnologiaId: z.number().int().positive(),
    factorEquipos: z.number().int().positive(),
  })).default([]),
  siteSurveySedes: z.array(z.object({
    nombreSede: z.string().min(1),
    rangoId: z.number().int().positive(),
  })).default([]),
});

async function assertBomAccess(req) {
  await bomsService.getBom(req.params.bomId, req.user);
}

cotizacionImplRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const cotizacion = await cotizacionService.getCotizacion(req.params.bomId);
    if (!cotizacion) throw new HttpError(404, 'Este BOM no tiene componente de Implementación configurado');
    res.json(cotizacion);
  } catch (err) {
    next(err);
  }
});

cotizacionImplRouter.put('/', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const data = cotizacionSchema.parse(req.body);
    res.json(await cotizacionService.upsertYCalcular(req.params.bomId, data, req.user.id));
  } catch (err) {
    next(err);
  }
});

cotizacionImplRouter.delete('/', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    await cotizacionService.eliminarCotizacion(req.params.bomId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

const comentarioSchema = z.object({ comentario: z.string().optional() });

// Aprobacion opcional (solo aplica cuando requiere_aprobacion = true) — mismo patron y mismos roles que especificacion.routes.js.
cotizacionImplRouter.post('/enviar-revision-lider', requireRole('preventa', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.json(await cotizacionService.enviarRevisionLider(req.params.bomId, req.user.id));
  } catch (err) {
    next(err);
  }
});

cotizacionImplRouter.post('/aprobar-lider', requireRole('lider_tecnico', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const { comentario } = comentarioSchema.parse(req.body);
    res.json(await cotizacionService.aprobarLider(req.params.bomId, req.user.id, comentario));
  } catch (err) {
    next(err);
  }
});

cotizacionImplRouter.post('/enviar-revision-gerencia', requireRole('lider_tecnico', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.json(await cotizacionService.enviarRevisionGerencia(req.params.bomId, req.user.id));
  } catch (err) {
    next(err);
  }
});

cotizacionImplRouter.post('/aprobar-gerencia', requireRole('gerencia', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const { comentario } = comentarioSchema.parse(req.body);
    res.json(await cotizacionService.aprobarGerencia(req.params.bomId, req.user.id, comentario));
  } catch (err) {
    next(err);
  }
});

cotizacionImplRouter.post('/rechazar', requireRole('lider_tecnico', 'gerencia', 'superadmin'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    const { comentario } = comentarioSchema.parse(req.body);
    res.json(await cotizacionService.rechazar(req.params.bomId, req.user.id, comentario));
  } catch (err) {
    next(err);
  }
});

cotizacionImplRouter.post('/marcar-generado', requirePermiso('crear'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.json(await cotizacionService.marcarGenerado(req.params.bomId, req.user.id));
  } catch (err) {
    next(err);
  }
});
