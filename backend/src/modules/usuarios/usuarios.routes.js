import { Router } from 'express';
import { z } from 'zod';
import * as usuariosService from './usuarios.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const usuariosRouter = Router();
usuariosRouter.use(authMiddleware, requirePermiso('administrar_usuarios'));

const crearSchema = z.object({
  nombre: z.string().min(1),
  correo: z.string().email(),
  password: z.string().min(8),
  rolClave: z.string().min(1),
});

const estadoSchema = z.object({ activo: z.boolean() });

usuariosRouter.get('/', async (req, res, next) => {
  try {
    res.json(await usuariosService.listUsuarios());
  } catch (err) {
    next(err);
  }
});

usuariosRouter.post('/', async (req, res, next) => {
  try {
    const data = crearSchema.parse(req.body);
    res.status(201).json(await usuariosService.crearUsuario(data));
  } catch (err) {
    next(err);
  }
});

usuariosRouter.patch('/:id/estado', async (req, res, next) => {
  try {
    const { activo } = estadoSchema.parse(req.body);
    res.json(await usuariosService.actualizarEstadoUsuario(req.params.id, activo));
  } catch (err) {
    next(err);
  }
});
