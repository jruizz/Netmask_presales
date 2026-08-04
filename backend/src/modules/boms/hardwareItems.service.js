import { query } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export async function listHardwareItems(bomId) {
  const { rows } = await query(
    `SELECT bhi.id, bhi.bom_id, bhi.cantidad, bhi.precio_unitario_snapshot,
            bhi.cantidad * bhi.precio_unitario_snapshot AS subtotal,
            ch.id AS hardware_id, ch.nombre, ch.sku, ch.numero_parte, ch.descripcion, ch.moneda
     FROM bom_hardware_items bhi
     JOIN catalogo_hardware ch ON ch.id = bhi.hardware_id
     WHERE bhi.bom_id = $1
     ORDER BY bhi.id ASC`,
    [bomId]
  );
  return rows;
}

export async function agregarHardwareItem(bomId, { hardwareId, cantidad }) {
  const { rows: hwRows } = await query(
    'SELECT id, precio FROM catalogo_hardware WHERE id = $1 AND activo = true',
    [hardwareId]
  );
  if (hwRows.length === 0) throw new HttpError(400, 'Ítem de hardware inválido');
  const { rows } = await query(
    `INSERT INTO bom_hardware_items (bom_id, hardware_id, cantidad, precio_unitario_snapshot)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [bomId, hardwareId, cantidad, hwRows[0].precio]
  );
  return rows[0];
}

export async function actualizarHardwareItem(bomId, itemId, { cantidad }) {
  const { rows } = await query(
    'UPDATE bom_hardware_items SET cantidad = $1 WHERE id = $2 AND bom_id = $3 RETURNING id',
    [cantidad, itemId, bomId]
  );
  if (rows.length === 0) throw new HttpError(404, 'Ítem no encontrado en este BOM');
  return rows[0];
}

export async function eliminarHardwareItem(bomId, itemId) {
  const { rows } = await query(
    'DELETE FROM bom_hardware_items WHERE id = $1 AND bom_id = $2 RETURNING id',
    [itemId, bomId]
  );
  if (rows.length === 0) throw new HttpError(404, 'Ítem no encontrado en este BOM');
}
