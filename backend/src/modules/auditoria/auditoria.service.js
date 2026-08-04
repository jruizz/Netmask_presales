import { query } from '../../db/pool.js';

export async function listarAuditoria({ entidadTipo, usuarioId, limit = 200 }) {
  const condiciones = [];
  const params = [];
  if (entidadTipo) {
    params.push(entidadTipo);
    condiciones.push(`a.entidad_tipo = $${params.length}`);
  }
  if (usuarioId) {
    params.push(usuarioId);
    condiciones.push(`a.usuario_id = $${params.length}`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';
  params.push(Math.min(Number(limit) || 200, 500));

  const { rows } = await query(
    `SELECT a.*, u.nombre AS usuario_nombre
     FROM auditoria_log a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     ${where}
     ORDER BY a.fecha DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}
