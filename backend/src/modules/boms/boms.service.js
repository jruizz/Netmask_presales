import { query } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

const ROLES_VISIBILIDAD_AMPLIADA = ['superadmin', 'gerencia'];

export async function listBoms(user, { mine }) {
  const verTodos = ROLES_VISIBILIDAD_AMPLIADA.includes(user.rolClave) && !mine;
  const baseSelect = `
    SELECT b.id, b.nombre, b.estado, b.creado_en,
           c.id AS cliente_id, c.razon_social AS cliente_nombre,
           u.nombre AS creador_nombre
    FROM boms b
    JOIN clientes c ON c.id = b.cliente_id
    JOIN usuarios u ON u.id = b.creado_por
  `;
  if (verTodos) {
    const { rows } = await query(`${baseSelect} ORDER BY b.creado_en DESC`);
    return rows;
  }
  const { rows } = await query(
    `${baseSelect} WHERE b.creado_por = $1 ORDER BY b.creado_en DESC`,
    [user.id]
  );
  return rows;
}

export async function crearBom({ clienteId, nombre }, creadoPorId) {
  const { rows: clienteRows } = await query('SELECT id FROM clientes WHERE id = $1 AND activo = true', [clienteId]);
  if (clienteRows.length === 0) throw new HttpError(400, 'Cliente invalido');
  const { rows } = await query(
    `INSERT INTO boms (cliente_id, nombre, creado_por) VALUES ($1, $2, $3) RETURNING *`,
    [clienteId, nombre, creadoPorId]
  );
  return rows[0];
}

export async function getBom(id, user) {
  const { rows } = await query(
    `SELECT b.*, c.razon_social AS cliente_nombre, u.nombre AS creador_nombre
     FROM boms b
     JOIN clientes c ON c.id = b.cliente_id
     JOIN usuarios u ON u.id = b.creado_por
     WHERE b.id = $1`,
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'BOM no encontrado');
  const bom = rows[0];
  const puedeVerTodos = ROLES_VISIBILIDAD_AMPLIADA.includes(user.rolClave);
  if (!puedeVerTodos && bom.creado_por !== user.id) {
    throw new HttpError(403, 'No tienes acceso a este BOM');
  }
  return bom;
}

export async function eliminarBom(id) {
  const { rows } = await query('DELETE FROM boms WHERE id = $1 RETURNING id', [id]);
  if (rows.length === 0) throw new HttpError(404, 'BOM no encontrado');
}
