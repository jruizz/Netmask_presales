import { query } from '../db/pool.js';

const METODOS_AUDITADOS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CAMPOS_SENSIBLES = new Set(['password', 'contrasena', 'passwordHash']);

function sanitizar(body) {
  if (!body || typeof body !== 'object') return null;
  const copia = { ...body };
  for (const clave of Object.keys(copia)) {
    if (CAMPOS_SENSIBLES.has(clave)) copia[clave] = '***';
  }
  return copia;
}

// Registra toda mutacion (POST/PUT/PATCH/DELETE) contra /api/*, exitosa o no,
// incluyendo intentos denegados por autenticacion/autorizacion (status >= 400).
// Se aplica de forma transversal en index.js en vez de instrumentar cada
// servicio individualmente.
export function auditMiddleware(req, res, next) {
  if (!METODOS_AUDITADOS.has(req.method)) return next();
  res.on('finish', () => {
    const segmentos = req.originalUrl.split('?')[0].split('/').filter(Boolean);
    const entidadTipo = (segmentos[0] === 'api' ? segmentos[1] : segmentos[0]) || 'desconocido';
    const entidadId = req.params?.id || req.params?.bomId || null;
    query(
      `INSERT INTO auditoria_log (usuario_id, accion, entidad_tipo, entidad_id, detalle, ip_origen)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        req.user?.id || null,
        `${req.method} ${req.originalUrl.split('?')[0]}`,
        entidadTipo,
        entidadId,
        JSON.stringify({ body: sanitizar(req.body), status: res.statusCode }),
        req.ip,
      ]
    ).catch((err) => console.error('[auditoria] error al registrar:', err.message));
  });
  next();
}
