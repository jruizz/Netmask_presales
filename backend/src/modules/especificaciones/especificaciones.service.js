import { query, pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { crearTransiciones, ESTADOS_EDITABLES } from '../../shared/aprobacionWorkflow.js';

export async function getEspecificacion(bomId) {
  const { rows } = await query(
    `SELECT e.*, t.nombre AS tipo_servicio_nombre
     FROM especificaciones e
     JOIN catalogo_serv_tipos t ON t.id = e.tipo_servicio_id
     WHERE e.bom_id = $1`,
    [bomId]
  );
  if (rows.length === 0) return null;
  const especificacion = rows[0];
  const { rows: historial } = await query(
    `SELECT h.*, u.nombre AS usuario_nombre
     FROM especificaciones_historial_estado h
     JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.especificacion_id = $1 ORDER BY h.fecha ASC`,
    [especificacion.id]
  );
  return { ...especificacion, historial };
}

export async function upsertEspecificacion(bomId, { tipoServicioId, datosWizard }, userId) {
  const existente = await getEspecificacion(bomId);
  if (existente && !ESTADOS_EDITABLES.includes(existente.estado)) {
    throw new HttpError(409, `No se puede editar: la especificación está en estado "${existente.estado}"`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let especificacionId;
    if (existente) {
      await client.query(
        `UPDATE especificaciones SET tipo_servicio_id = $1, datos_wizard = $2, actualizado_por = $3, actualizado_en = now()
         WHERE bom_id = $4`,
        [tipoServicioId, JSON.stringify(datosWizard), userId, bomId]
      );
      especificacionId = existente.id;
    } else {
      const { rows } = await client.query(
        `INSERT INTO especificaciones (bom_id, tipo_servicio_id, datos_wizard, creado_por)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [bomId, tipoServicioId, JSON.stringify(datosWizard), userId]
      );
      especificacionId = rows[0].id;
      await client.query(
        `INSERT INTO especificaciones_historial_estado (especificacion_id, estado_anterior, estado_nuevo, usuario_id, comentario)
         VALUES ($1, NULL, 'borrador', $2, 'Especificación creada')`,
        [especificacionId, userId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getEspecificacion(bomId);
}

export async function eliminarEspecificacion(bomId) {
  const existente = await getEspecificacion(bomId);
  if (!existente) throw new HttpError(404, 'Este BOM no tiene componente de Servicios Netmask');
  if (existente.estado !== 'borrador') {
    throw new HttpError(409, 'Solo se puede eliminar una especificación en estado "borrador"');
  }
  await query('DELETE FROM especificaciones WHERE bom_id = $1', [bomId]);
}

export const {
  enviarRevisionLider, aprobarLider, enviarRevisionGerencia, aprobarGerencia, rechazar, marcarGenerado,
} = crearTransiciones({
  obtenerEntidad: getEspecificacion,
  entidadNoEncontrada: 'Este BOM no tiene componente de Servicios Netmask',
  aplicarTransicion: async (client, { existente, bomId, estadoNuevo, userId, comentario }) => {
    await client.query(
      'UPDATE especificaciones SET estado = $1, actualizado_por = $2, actualizado_en = now() WHERE bom_id = $3',
      [estadoNuevo, userId, bomId]
    );
    await client.query(
      `INSERT INTO especificaciones_historial_estado (especificacion_id, estado_anterior, estado_nuevo, usuario_id, comentario)
       VALUES ($1, $2, $3, $4, $5)`,
      [existente.id, existente.estado, estadoNuevo, userId, comentario || null]
    );
  },
});
