import { query } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export async function buscarHardware(q) {
  if (q) {
    const { rows } = await query(
      `SELECT * FROM catalogo_hardware
       WHERE activo = true AND (nombre ILIKE $1 OR sku ILIKE $1 OR numero_parte ILIKE $1)
       ORDER BY nombre ASC LIMIT 50`,
      [`%${q}%`]
    );
    return rows;
  }
  const { rows } = await query(
    'SELECT * FROM catalogo_hardware WHERE activo = true ORDER BY nombre ASC LIMIT 50'
  );
  return rows;
}

export async function crearHardware(data, creadoPorId) {
  const { nombre, sku, numeroParte, descripcion, precio, moneda, tecnologiaImplSugeridaId } = data;
  try {
    const { rows } = await query(
      `INSERT INTO catalogo_hardware (nombre, sku, numero_parte, descripcion, precio, moneda, tecnologia_impl_sugerida_id, creado_por)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [nombre, sku || null, numeroParte || null, descripcion || null, precio, moneda || 'COP', tecnologiaImplSugeridaId || null, creadoPorId]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, `Ya existe un ítem de hardware con el SKU "${sku}"`);
    throw err;
  }
}

export async function actualizarHardware(id, data) {
  const { nombre, sku, numeroParte, descripcion, precio, moneda, tecnologiaImplSugeridaId } = data;
  try {
    const { rows } = await query(
      `UPDATE catalogo_hardware SET nombre = $1, sku = $2, numero_parte = $3, descripcion = $4,
         precio = $5, moneda = $6, tecnologia_impl_sugerida_id = $7
       WHERE id = $8 RETURNING *`,
      [nombre, sku || null, numeroParte || null, descripcion || null, precio, moneda || 'COP', tecnologiaImplSugeridaId || null, id]
    );
    if (rows.length === 0) throw new HttpError(404, 'Ítem de hardware no encontrado');
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, `Ya existe un ítem de hardware con el SKU "${sku}"`);
    throw err;
  }
}

export async function eliminarHardware(id) {
  const { rows } = await query(
    'UPDATE catalogo_hardware SET activo = false WHERE id = $1 RETURNING id',
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Ítem de hardware no encontrado');
}
