import { Router } from 'express';
import { query } from '../../db/pool.js';
import * as bomsService from './boms.service.js';
import { authMiddleware } from '../../middlewares/authMiddleware.js';
import { requirePermiso } from '../../middlewares/roleGuard.js';

export const sugerenciasRouter = Router({ mergeParams: true });
sugerenciasRouter.use(authMiddleware);

// Resuelve, a partir del hardware ya agregado al BOM, que tecnologias de
// Implementacion se sugieren (editable, no forzada) segun el campo
// catalogo_hardware.tecnologia_impl_sugerida_id.
sugerenciasRouter.get('/', requirePermiso('ver'), async (req, res, next) => {
  try {
    await bomsService.getBom(req.params.bomId, req.user);
    const { rows } = await query(
      `SELECT ch.tecnologia_impl_sugerida_id AS tecnologia_id, t.nombre AS tecnologia_nombre,
              SUM(bhi.cantidad) AS factor_equipos_sugerido
       FROM bom_hardware_items bhi
       JOIN catalogo_hardware ch ON ch.id = bhi.hardware_id
       JOIN catalogo_impl_tecnologias t ON t.id = ch.tecnologia_impl_sugerida_id
       WHERE bhi.bom_id = $1 AND ch.tecnologia_impl_sugerida_id IS NOT NULL
       GROUP BY ch.tecnologia_impl_sugerida_id, t.nombre`,
      [req.params.bomId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
