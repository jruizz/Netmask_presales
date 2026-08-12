import { pool } from '../db/pool.js';
import { HttpError } from '../middlewares/errorHandler.js';

// Estados desde los que una entidad con flujo de aprobacion sigue siendo
// editable (antes de entrar a revision). Compartido por especificaciones
// (Servicios) y cotizaciones_impl (Implementacion).
export const ESTADOS_EDITABLES = ['borrador', 'rechazado'];

// Factory del flujo de aprobacion de 6 estados (borrador -> revision_lider ->
// aprobado_lider -> revision_gerencia -> aprobado -> generado, + rechazado
// desde cualquiera de las dos revisiones). especificaciones.service.js y
// cotizaciones_impl.service.js duplicaban esto identico salvo por la tabla/
// columnas de destino y (en Implementacion) el flag requiere_aprobacion --
// ver 11_aprobacion_implementacion.sql. Cada modulo sigue siendo responsable
// de su propio SQL de UPDATE + historial via `aplicarTransicion`.
export function crearTransiciones({ obtenerEntidad, entidadNoEncontrada, requiereFlagAprobacion = false, aplicarTransicion }) {
  async function transicionar(bomId, { estadosPermitidos, estadoNuevo, userId, comentario }) {
    const existente = await obtenerEntidad(bomId);
    if (!existente) throw new HttpError(404, entidadNoEncontrada);
    if (requiereFlagAprobacion && !existente.requiere_aprobacion) {
      throw new HttpError(409, 'Esta cotización no requiere aprobación (el checkbox está desactivado)');
    }
    if (!estadosPermitidos.includes(existente.estado)) {
      throw new HttpError(409, `No se puede pasar a "${estadoNuevo}" desde el estado actual "${existente.estado}"`);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await aplicarTransicion(client, { existente, bomId, estadoNuevo, userId, comentario });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return obtenerEntidad(bomId);
  }

  return {
    enviarRevisionLider: (bomId, userId) =>
      transicionar(bomId, { estadosPermitidos: ['borrador', 'rechazado'], estadoNuevo: 'revision_lider', userId }),
    aprobarLider: (bomId, userId, comentario) =>
      transicionar(bomId, { estadosPermitidos: ['revision_lider'], estadoNuevo: 'aprobado_lider', userId, comentario }),
    enviarRevisionGerencia: (bomId, userId) =>
      transicionar(bomId, { estadosPermitidos: ['aprobado_lider'], estadoNuevo: 'revision_gerencia', userId }),
    aprobarGerencia: (bomId, userId, comentario) =>
      transicionar(bomId, { estadosPermitidos: ['revision_gerencia'], estadoNuevo: 'aprobado', userId, comentario }),
    rechazar: (bomId, userId, comentario) =>
      transicionar(bomId, { estadosPermitidos: ['revision_lider', 'revision_gerencia'], estadoNuevo: 'rechazado', userId, comentario }),
    marcarGenerado: (bomId, userId) =>
      transicionar(bomId, { estadosPermitidos: ['aprobado'], estadoNuevo: 'generado', userId }),
  };
}
