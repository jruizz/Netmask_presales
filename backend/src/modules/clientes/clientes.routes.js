import { Router } from 'express';
import { z } from 'zod';
import * as clientesService from './clientes.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso, requireRole } from '../../middlewares/roleGuard.js';

export const clientesRouter = Router();
clientesRouter.use(authMiddleware);

const clienteSchema = z.object({
  razonSocial: z.string().min(1),
  nit: z.string().optional(),
  sector: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoCorreo: z.string().email().optional().or(z.literal('')),
  contactoTelefono: z.string().optional(),
  ciudad: z.string().optional(),
});

clientesRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await clientesService.listClientes());
  } catch (err) {
    next(err);
  }
});

clientesRouter.get('/:id', requirePermiso('ver'), async (req, res, next) => {
  try {
    res.json(await clientesService.getCliente(req.params.id));
  } catch (err) {
    next(err);
  }
});

clientesRouter.post('/', requirePermiso('crear'), async (req, res, next) => {
  try {
    const data = clienteSchema.parse(req.body);
    res.status(201).json(await clientesService.crearCliente(data, req.user.id));
  } catch (err) {
    next(err);
  }
});

clientesRouter.put('/:id', requireRole('ingenieria', 'superadmin'), async (req, res, next) => {
  try {
    const data = clienteSchema.parse(req.body);
    res.json(await clientesService.actualizarCliente(req.params.id, data));
  } catch (err) {
    next(err);
  }
});

clientesRouter.delete('/:id', requireRole('superadmin'), async (req, res, next) => {
  try {
    await clientesService.eliminarCliente(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
