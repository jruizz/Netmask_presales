import { query } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { ROLES_VISIBILIDAD_AMPLIADA } from '../../shared/roles.js';

export async function listBoms(user, { mine }) {
  const verTodos = ROLES_VISIBILIDAD_AMPLIADA.includes(user.rolClave) && !mine;
  const baseSelect = `
    SELECT b.id, b.nombre, b.estado, b.ubicacion_proyecto, b.id_oportunidad, b.creado_en,
           c.id AS cliente_id, c.nombre_cliente AS cliente_nombre,
           co.id AS comercial_id, co.nombre AS comercial_nombre,
           u.nombre AS creador_nombre
    FROM boms b
    JOIN clientes c ON c.id = b.cliente_id
    LEFT JOIN comerciales co ON co.id = b.comercial_id
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

export async function crearBom({ clienteId, nombre, comercialId, ubicacionProyecto, idOportunidad }, creadoPorId) {
  const { rows: clienteRows } = await query('SELECT id FROM clientes WHERE id = $1 AND activo = true', [clienteId]);
  if (clienteRows.length === 0) throw new HttpError(400, 'Cliente invalido');
  const { rows: comercialRows } = await query('SELECT id FROM comerciales WHERE id = $1 AND activo = true', [comercialId]);
  if (comercialRows.length === 0) throw new HttpError(400, 'Comercial invalido');
  const { rows } = await query(
    `INSERT INTO boms (cliente_id, nombre, comercial_id, ubicacion_proyecto, id_oportunidad, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [clienteId, nombre, comercialId, ubicacionProyecto, idOportunidad || null, creadoPorId]
  );
  return rows[0];
}

export async function getBom(id, user) {
  const { rows } = await query(
    `SELECT b.*, c.nombre_cliente AS cliente_nombre, co.nombre AS comercial_nombre, u.nombre AS creador_nombre
     FROM boms b
     JOIN clientes c ON c.id = b.cliente_id
     LEFT JOIN comerciales co ON co.id = b.comercial_id
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

export async function actualizarBom(id, { nombre, clienteId, comercialId, ubicacionProyecto, idOportunidad, notas }) {
  if (clienteId !== undefined) {
    const { rows } = await query('SELECT id FROM clientes WHERE id = $1 AND activo = true', [clienteId]);
    if (rows.length === 0) throw new HttpError(400, 'Cliente invalido');
  }
  if (comercialId !== undefined) {
    const { rows } = await query('SELECT id FROM comerciales WHERE id = $1 AND activo = true', [comercialId]);
    if (rows.length === 0) throw new HttpError(400, 'Comercial invalido');
  }

  const columnas = [];
  const valores = [];
  const agregar = (columna, valor) => {
    valores.push(valor);
    columnas.push(`${columna} = $${valores.length}`);
  };
  if (nombre !== undefined) agregar('nombre', nombre);
  if (clienteId !== undefined) agregar('cliente_id', clienteId);
  if (comercialId !== undefined) agregar('comercial_id', comercialId);
  if (ubicacionProyecto !== undefined) agregar('ubicacion_proyecto', ubicacionProyecto);
  if (idOportunidad !== undefined) agregar('id_oportunidad', idOportunidad === '' ? null : idOportunidad);
  if (notas !== undefined) agregar('notas', notas);
  if (columnas.length === 0) throw new HttpError(400, 'Nada para actualizar');

  valores.push(id);
  const { rows } = await query(
    `UPDATE boms SET ${columnas.join(', ')} WHERE id = $${valores.length} RETURNING id`,
    valores
  );
  if (rows.length === 0) throw new HttpError(404, 'BOM no encontrado');
  return rows[0];
}

export async function eliminarBom(id) {
  const { rows } = await query('DELETE FROM boms WHERE id = $1 RETURNING id', [id]);
  if (rows.length === 0) throw new HttpError(404, 'BOM no encontrado');
}
