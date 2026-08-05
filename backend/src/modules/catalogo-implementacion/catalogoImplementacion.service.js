import { query, pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export async function listTecnologias() {
  const { rows: tecnologias } = await query(
    `SELECT t.id, t.nombre, t.es_base, t.activo, g.id AS grupo_id, g.nombre AS grupo_nombre
     FROM catalogo_impl_tecnologias t
     JOIN catalogo_impl_grupos g ON g.id = t.grupo_id
     WHERE t.activo = true
     ORDER BY g.nombre, t.nombre`
  );
  const { rows: actividades } = await query(
    `SELECT * FROM catalogo_impl_actividades ORDER BY tecnologia_id, orden`
  );
  const actividadesPorTecnologia = {};
  actividades.forEach((a) => {
    (actividadesPorTecnologia[a.tecnologia_id] ||= []).push(a);
  });
  return tecnologias.map((t) => ({ ...t, actividades: actividadesPorTecnologia[t.id] || [] }));
}

export async function crearTecnologia({ grupoNombre, nombre, actividades }, creadoPorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let { rows: grupoRows } = await client.query('SELECT id FROM catalogo_impl_grupos WHERE nombre = $1', [grupoNombre]);
    let grupoId;
    if (grupoRows.length === 0) {
      const inserted = await client.query('INSERT INTO catalogo_impl_grupos (nombre) VALUES ($1) RETURNING id', [grupoNombre]);
      grupoId = inserted.rows[0].id;
    } else {
      grupoId = grupoRows[0].id;
    }

    let tecRows;
    try {
      tecRows = await client.query(
        `INSERT INTO catalogo_impl_tecnologias (grupo_id, nombre, es_base, creado_por)
         VALUES ($1, $2, false, $3) RETURNING id`,
        [grupoId, nombre, creadoPorId]
      );
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, `Ya existe una tecnología con el nombre "${nombre}"`);
      throw err;
    }
    const tecnologiaId = tecRows.rows[0].id;

    for (const [i, a] of actividades.entries()) {
      await client.query(
        `INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, unidades_por_equipo, orden)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [tecnologiaId, a.texto, a.horas, a.modo, a.unidadesPorEquipo || 1, i + 1]
      );
    }

    await client.query('COMMIT');
    return { id: tecnologiaId, nombre, grupoId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function actualizarTecnologia(id, { grupoNombre, nombre, actividades }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existeRows } = await client.query('SELECT id FROM catalogo_impl_tecnologias WHERE id = $1', [id]);
    if (existeRows.length === 0) throw new HttpError(404, 'Tecnología no encontrada');

    let { rows: grupoRows } = await client.query('SELECT id FROM catalogo_impl_grupos WHERE nombre = $1', [grupoNombre]);
    let grupoId;
    if (grupoRows.length === 0) {
      const inserted = await client.query('INSERT INTO catalogo_impl_grupos (nombre) VALUES ($1) RETURNING id', [grupoNombre]);
      grupoId = inserted.rows[0].id;
    } else {
      grupoId = grupoRows[0].id;
    }

    try {
      await client.query(
        'UPDATE catalogo_impl_tecnologias SET grupo_id = $1, nombre = $2 WHERE id = $3',
        [grupoId, nombre, id]
      );
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, `Ya existe una tecnología con el nombre "${nombre}"`);
      throw err;
    }

    await client.query('DELETE FROM catalogo_impl_actividades WHERE tecnologia_id = $1', [id]);
    for (const [i, a] of actividades.entries()) {
      await client.query(
        `INSERT INTO catalogo_impl_actividades (tecnologia_id, texto, horas, modo, unidades_por_equipo, orden)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, a.texto, a.horas, a.modo, a.unidadesPorEquipo || 1, i + 1]
      );
    }

    await client.query('COMMIT');
    return { id, nombre, grupoId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function eliminarTecnologia(id) {
  const { rows } = await query(
    'UPDATE catalogo_impl_tecnologias SET activo = false WHERE id = $1 RETURNING id',
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Tecnología no encontrada');
}

export async function getParametros() {
  const { rows } = await query('SELECT clave, valor FROM catalogo_impl_parametros');
  const obj = {};
  rows.forEach((r) => { obj[r.clave] = Number(r.valor); });
  return obj;
}

export async function getTarifas() {
  const { rows } = await query('SELECT nivel, condicion, tarifa_cop_hora FROM catalogo_impl_tarifas');
  const obj = { interno: {}, aliado: {} };
  rows.forEach((r) => { obj[r.condicion][r.nivel] = Number(r.tarifa_cop_hora); });
  return obj;
}

export async function getSiteSurveyRangos() {
  const { rows } = await query('SELECT * FROM catalogo_impl_site_survey_rangos ORDER BY orden');
  return rows;
}

export async function getBloquesFijos() {
  const { rows } = await query('SELECT * FROM catalogo_impl_bloques_fijos ORDER BY tipo, orden');
  return rows;
}
