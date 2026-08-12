import { Router } from 'express';
import * as documentosService from '../documentos/documentos.service.js';
import { assertBomAccess } from './bomAccess.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const bomDocumentosRouter = Router({ mergeParams: true });
bomDocumentosRouter.use(authMiddleware);

bomDocumentosRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.json(await documentosService.listarDocumentos(req.params.bomId));
  } catch (err) {
    next(err);
  }
});

bomDocumentosRouter.post('/generar-excel-cotizacion', requirePermiso('descargar'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.status(201).json(await documentosService.generarExcelCotizacionDoc(req.params.bomId, req.user));
  } catch (err) {
    next(err);
  }
});

bomDocumentosRouter.post('/generar-word-especificacion', requirePermiso('descargar'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.status(201).json(await documentosService.generarWordEspecificacionDoc(req.params.bomId, req.user));
  } catch (err) {
    next(err);
  }
});

bomDocumentosRouter.post('/generar-excel-bom', requirePermiso('descargar'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.status(201).json(await documentosService.generarExcelBomDoc(req.params.bomId, req.user));
  } catch (err) {
    next(err);
  }
});

bomDocumentosRouter.post('/generar-propuesta-tecnica', requirePermiso('descargar'), async (req, res, next) => {
  try {
    await assertBomAccess(req);
    res.status(201).json(await documentosService.generarWordPropuestaTecnicaDoc(req.params.bomId, req.user));
  } catch (err) {
    next(err);
  }
});
