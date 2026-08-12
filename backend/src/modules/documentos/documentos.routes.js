import { Router } from 'express';
import * as documentosService from './documentos.service.js';
import * as bomsService from '../boms/boms.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const documentosRouter = Router();
documentosRouter.use(authMiddleware);

documentosRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await documentosService.listarDocumentosGlobal(req.user, { tipo: req.query.tipo }));
  } catch (err) {
    next(err);
  }
});

documentosRouter.get('/:id/descargar', requirePermiso('descargar'), async (req, res, next) => {
  try {
    const documento = await documentosService.obtenerDocumentoParaDescarga(req.params.id);
    await bomsService.getBom(documento.bom_id, req.user);
    res.set('Content-Type', documento.content_type);
    res.set('Content-Disposition', `attachment; filename="${documento.nombre_archivo}"`);
    res.send(documento.contenido);
  } catch (err) {
    next(err);
  }
});
