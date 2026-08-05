import { query } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export async function listComerciales() {
  const { rows } = await query(
    'SELECT * FROM comerciales WHERE activo = true ORDER BY sector, nombre'
  );
  return rows;
}

export async function crearComercial({ nombre, sector }) {
  const { rows } = await query(
    'INSERT INTO comerciales (nombre, sector) VALUES ($1, $2) RETURNING *',
    [nombre, sector]
  );
  return rows[0];
}

export async function actualizarComercial(id, { nombre, sector }) {
  const { rows } = await query(
    'UPDATE comerciales SET nombre = $1, sector = $2 WHERE id = $3 RETURNING *',
    [nombre, sector, id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Comercial no encontrado');
  return rows[0];
}

export async function eliminarComercial(id) {
  const { rows } = await query(
    'UPDATE comerciales SET activo = false WHERE id = $1 RETURNING id',
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Comercial no encontrado');
}
