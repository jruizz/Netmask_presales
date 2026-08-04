import { query, pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export async function listPermisos() {
  const { rows } = await query('SELECT * FROM permisos ORDER BY clave');
  return rows;
}

export async function listRoles() {
  const { rows: roles } = await query('SELECT * FROM roles ORDER BY id');
  const { rows: asignaciones } = await query(
    `SELECT rp.rol_id, p.clave FROM roles_permisos rp JOIN permisos p ON p.id = rp.permiso_id`
  );
  const permisosPorRol = {};
  asignaciones.forEach((a) => { (permisosPorRol[a.rol_id] ||= []).push(a.clave); });
  return roles.map((r) => ({ ...r, permisos: permisosPorRol[r.id] || [] }));
}

export async function actualizarPermisosRol(rolId, clavesPermisos) {
  const { rows: rolRows } = await query('SELECT id FROM roles WHERE id = $1', [rolId]);
  if (rolRows.length === 0) throw new HttpError(404, 'Rol no encontrado');

  const { rows: permisoRows } = await query('SELECT id, clave FROM permisos WHERE clave = ANY($1)', [clavesPermisos]);
  if (permisoRows.length !== clavesPermisos.length) {
    const validos = new Set(permisoRows.map((p) => p.clave));
    const invalidos = clavesPermisos.filter((c) => !validos.has(c));
    throw new HttpError(400, `Permisos inválidos: ${invalidos.join(', ')}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM roles_permisos WHERE rol_id = $1', [rolId]);
    for (const p of permisoRows) {
      await client.query('INSERT INTO roles_permisos (rol_id, permiso_id) VALUES ($1, $2)', [rolId, p.id]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
