import { Router } from 'express';
import * as catalogoServiciosService from './catalogoServicios.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const catalogoServiciosRouter = Router();
catalogoServiciosRouter.use(authMiddleware, requirePermiso('ver'));

catalogoServiciosRouter.get('/tipos', async (req, res, next) => {
  try {
    res.json(await catalogoServiciosService.listTipos());
  } catch (err) {
    next(err);
  }
});

catalogoServiciosRouter.get('/categorias-tecnologia', async (req, res, next) => {
  try {
    res.json(await catalogoServiciosService.listCategoriasTecnologia());
  } catch (err) {
    next(err);
  }
});

catalogoServiciosRouter.get('/niveles', async (req, res, next) => {
  try {
    res.json(await catalogoServiciosService.listNiveles());
  } catch (err) {
    next(err);
  }
});

catalogoServiciosRouter.get('/severidades', async (req, res, next) => {
  try {
    res.json(await catalogoServiciosService.listSeveridades());
  } catch (err) {
    next(err);
  }
});
