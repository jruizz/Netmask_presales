import { query } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import { ROLES_VISIBILIDAD_AMPLIADA } from '../../shared/roles.js';
import * as bomsService from '../boms/boms.service.js';
import * as cotizacionImplService from '../cotizaciones/cotizacionImpl.service.js';
import * as especificacionesService from '../especificaciones/especificaciones.service.js';
import * as catalogoServiciosService from '../catalogo-servicios/catalogoServicios.service.js';
import { generarExcelCotizacion } from './excelCotizacion.js';
import { generarExcelBom } from './excelBom.js';
import { generarWordEspecificacion } from './wordEspecificacion.js';
import { generarWordPropuestaTecnica } from './wordPropuestaTecnica.js';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOCX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

async function cargarContextoBom(bomId, user) {
  // bom/hardwareItems/cotizacion/especificacion solo dependen de bomId (ya
  // conocido), no unas de otras -- se piden en paralelo en vez de en serie.
  const [bom, { rows: hardwareItems }, cotizacion, especificacion] = await Promise.all([
    bomsService.getBom(bomId, user),
    query(
      `SELECT bhi.*, ch.nombre, ch.marca, ch.sku, ch.descripcion, ch.moneda, bhi.cantidad * bhi.precio_unitario_snapshot AS subtotal
       FROM bom_hardware_items bhi JOIN catalogo_hardware ch ON ch.id = bhi.hardware_id
       WHERE bhi.bom_id = $1 ORDER BY bhi.id`,
      [bomId]
    ),
    cotizacionImplService.getCotizacion(bomId),
    especificacionesService.getEspecificacion(bomId),
  ]);

  // cliente depende de bom.cliente_id y tipoServicio de especificacion --
  // ambas ya resueltas arriba, pero siguen siendo independientes entre si.
  const [{ rows: clienteRows }, tipoServicio] = await Promise.all([
    query('SELECT * FROM clientes WHERE id = $1', [bom.cliente_id]),
    especificacion
      ? query('SELECT * FROM catalogo_serv_tipos WHERE id = $1', [especificacion.tipo_servicio_id]).then((r) => r.rows[0])
      : Promise.resolve(null),
  ]);

  return { bom, cliente: clienteRows[0], hardwareItems, cotizacion, especificacion, tipoServicio };
}

async function guardarDocumento({ bomId, tipo, nombreArchivo, contentType, buffer, userId }) {
  const { rows } = await query(
    `INSERT INTO documentos_generados (bom_id, tipo, nombre_archivo, content_type, contenido, tamano_bytes, generado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, tipo, nombre_archivo, content_type, tamano_bytes, generado_en`,
    [bomId, tipo, nombreArchivo, contentType, buffer, buffer.length, userId]
  );
  return rows[0];
}

export async function generarExcelCotizacionDoc(bomId, user) {
  const ctx = await cargarContextoBom(bomId, user);
  if (!ctx.cotizacion) throw new HttpError(404, 'Este BOM no tiene componente de Implementación');
  const buffer = await generarExcelCotizacion(ctx);
  const nombreArchivo = `Cotizacion_${ctx.bom.nombre}.xlsx`.replace(/\s+/g, '_');
  return guardarDocumento({ bomId, tipo: 'excel_cotizacion', nombreArchivo, contentType: XLSX_CONTENT_TYPE, buffer, userId: user.id });
}

export async function generarWordEspecificacionDoc(bomId, user) {
  const ctx = await cargarContextoBom(bomId, user);
  if (!ctx.especificacion) throw new HttpError(404, 'Este BOM no tiene componente de Servicios Netmask');
  const severidadesCatalogo = await catalogoServiciosService.listSeveridades();
  const buffer = await generarWordEspecificacion({ ...ctx, severidadesCatalogo });
  const nombreArchivo = `Especificacion_${ctx.bom.nombre}.docx`.replace(/\s+/g, '_');
  return guardarDocumento({ bomId, tipo: 'word_especificacion', nombreArchivo, contentType: DOCX_CONTENT_TYPE, buffer, userId: user.id });
}

export async function generarExcelBomDoc(bomId, user) {
  const ctx = await cargarContextoBom(bomId, user);
  if (!ctx.cotizacion && !ctx.hardwareItems.length && !ctx.especificacion) {
    throw new HttpError(409, 'Este BOM no tiene ningún componente configurado todavía');
  }
  const buffer = await generarExcelBom({ ...ctx, tipoServicioNombre: ctx.tipoServicio?.nombre });
  const nombreArchivo = `BOM_${ctx.bom.nombre}.xlsx`.replace(/\s+/g, '_');
  return guardarDocumento({ bomId, tipo: 'excel_bom', nombreArchivo, contentType: XLSX_CONTENT_TYPE, buffer, userId: user.id });
}

export async function generarWordPropuestaTecnicaDoc(bomId, user) {
  const ctx = await cargarContextoBom(bomId, user);
  if (!ctx.cotizacion && !ctx.hardwareItems.length && !ctx.especificacion) {
    throw new HttpError(409, 'Este BOM no tiene ningún componente configurado todavía');
  }
  const buffer = await generarWordPropuestaTecnica(ctx);
  const nombreArchivo = `Propuesta_Tecnica_${ctx.bom.nombre}.docx`.replace(/\s+/g, '_');
  return guardarDocumento({ bomId, tipo: 'word_propuesta_tecnica', nombreArchivo, contentType: DOCX_CONTENT_TYPE, buffer, userId: user.id });
}

export async function listarDocumentosGlobal(user, { tipo } = {}) {
  const verTodos = ROLES_VISIBILIDAD_AMPLIADA.includes(user.rolClave);
  const condiciones = [];
  const params = [];
  if (!verTodos) {
    params.push(user.id);
    condiciones.push(`b.creado_por = $${params.length}`);
  }
  if (tipo) {
    params.push(tipo);
    condiciones.push(`d.tipo = $${params.length}`);
  }
  const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT d.id, d.tipo, d.nombre_archivo, d.tamano_bytes, d.generado_en,
            b.id AS bom_id, b.nombre AS bom_nombre, c.nombre_cliente AS cliente_nombre, u.nombre AS generado_por_nombre
     FROM documentos_generados d
     JOIN boms b ON b.id = d.bom_id
     JOIN clientes c ON c.id = b.cliente_id
     JOIN usuarios u ON u.id = d.generado_por
     ${where}
     ORDER BY d.generado_en DESC
     LIMIT 300`,
    params
  );
  return rows;
}

export async function listarDocumentos(bomId) {
  const { rows } = await query(
    `SELECT d.id, d.tipo, d.nombre_archivo, d.content_type, d.tamano_bytes, d.generado_en, u.nombre AS generado_por_nombre
     FROM documentos_generados d JOIN usuarios u ON u.id = d.generado_por
     WHERE d.bom_id = $1 ORDER BY d.generado_en DESC`,
    [bomId]
  );
  return rows;
}

export async function obtenerDocumentoParaDescarga(documentoId) {
  const { rows } = await query('SELECT * FROM documentos_generados WHERE id = $1', [documentoId]);
  if (rows.length === 0) throw new HttpError(404, 'Documento no encontrado');
  return rows[0];
}
