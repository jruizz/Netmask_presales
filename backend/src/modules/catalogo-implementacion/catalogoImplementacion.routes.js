import { Router } from 'express';
import { z } from 'zod';
import * as catalogoService from './catalogoImplementacion.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const catalogoImplementacionRouter = Router();
catalogoImplementacionRouter.use(authMiddleware);

const actividadSchema = z.object({
  texto: z.string().min(1),
  horas: z.number().positive(),
  modo: z.enum(['en_sitio', 'remota']),
  unidadesPorEquipo: z.number().positive().optional(),
});

const tecnologiaSchema = z.object({
  grupoNombre: z.string().min(1),
  nombre: z.string().min(1),
  actividades: z.array(actividadSchema).min(1),
});

catalogoImplementacionRouter.get('/tecnologias', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await catalogoService.listTecnologias());
  } catch (err) {
    next(err);
  }
});

catalogoImplementacionRouter.post('/tecnologias', requirePermiso('administrar_catalogos'), async (req, res, next) => {
  try {
    const data = tecnologiaSchema.parse(req.body);
    res.status(201).json(await catalogoService.crearTecnologia(data, req.user.id));
  } catch (err) {
    next(err);
  }
});

catalogoImplementacionRouter.get('/parametros', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await catalogoService.getParametros());
  } catch (err) {
    next(err);
  }
});

catalogoImplementacionRouter.get('/tarifas', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await catalogoService.getTarifas());
  } catch (err) {
    next(err);
  }
});

catalogoImplementacionRouter.get('/site-survey-rangos', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await catalogoService.getSiteSurveyRangos());
  } catch (err) {
    next(err);
  }
});

catalogoImplementacionRouter.get('/bloques-fijos', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await catalogoService.getBloquesFijos());
  } catch (err) {
    next(err);
  }
});
