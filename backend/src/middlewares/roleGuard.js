import { query } from '../db/pool.js';
import { HttpError } from './errorHandler.js';

export function requirePermiso(clave) {
  return async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, 'No autenticado');
      const { rows } = await query(
        `SELECT 1 FROM roles_permisos rp
         JOIN roles r ON r.id = rp.rol_id
         JOIN permisos p ON p.id = rp.permiso_id
         WHERE r.clave = $1 AND p.clave = $2`,
        [req.user.rolClave, clave]
      );
      if (rows.length === 0) throw new HttpError(403, `Tu rol no tiene el permiso "${clave}"`);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function requireRole(...claves) {
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'No autenticado'));
    if (!claves.includes(req.user.rolClave)) {
      return next(new HttpError(403, `Requiere uno de estos roles: ${claves.join(', ')}`));
    }
    next();
  };
}
