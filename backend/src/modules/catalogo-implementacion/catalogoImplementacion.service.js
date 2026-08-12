import { query, pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export async function listMarcas() {
  const { rows } = await query('SELECT id, nombre FROM catalogo_impl_marcas WHERE activo = true ORDER BY nombre');
  return rows;
}

export async function crearMarca({ nombre }) {
  try {
    const { rows } = await query('INSERT INTO catalogo_impl_marcas (nombre) VALUES ($1) RETURNING id, nombre', [nombre]);
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, `Ya existe una marca con el nombre "${nombre}"`);
    throw err;
  }
}

export async function eliminarMarca(id) {
  const { rows } = await query('UPDATE catalogo_impl_marcas SET activo = false WHERE id = $1 RETURNING id', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Marca no encontrada');
}

async function resolverGrupo(client, marcaId, grupoNombre) {
  const { rows: grupoRows } = await client.query(
    'SELECT id FROM catalogo_impl_grupos WHERE marca_id = $1 AND nombre = $2',
    [marcaId, grupoNombre]
  );
  if (grupoRows.length > 0) return grupoRows[0].id;
  const inserted = await client.query(
    'INSERT INTO catalogo_impl_grupos (marca_id, nombre) VALUES ($1, $2) RETURNING id',
    [marcaId, grupoNombre]
  );
  return inserted.rows[0].id;
}

export async function listTecnologias() {
  const [{ rows: tecnologias }, { rows: actividades }] = await Promise.all([
    query(
      `SELECT t.id, t.nombre, t.es_base, t.activo,
              g.id AS grupo_id, g.nombre AS grupo_nombre,
              m.id AS marca_id, m.nombre AS marca_nombre
       FROM catalogo_impl_tecnologias t
       JOIN catalogo_impl_grupos g ON g.id = t.grupo_id
       JOIN catalogo_impl_marcas m ON m.id = g.marca_id
       WHERE t.activo = true
       ORDER BY m.nombre, g.nombre, t.nombre`
    ),
    query('SELECT * FROM catalogo_impl_actividades ORDER BY tecnologia_id, orden'),
  ]);
  const actividadesPorTecnologia = {};
  actividades.forEach((a) => {
    (actividadesPorTecnologia[a.tecnologia_id] ||= []).push(a);
  });
  return tecnologias.map((t) => ({ ...t, actividades: actividadesPorTecnologia[t.id] || [] }));
}

export async function crearTecnologia({ marcaId, grupoNombre, nombre, actividades }, creadoPorId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const grupoId = await resolverGrupo(client, marcaId, grupoNombre);

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

export async function actualizarTecnologia(id, { marcaId, grupoNombre, nombre, actividades }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existeRows } = await client.query('SELECT id FROM catalogo_impl_tecnologias WHERE id = $1', [id]);
    if (existeRows.length === 0) throw new HttpError(404, 'Tecnología no encontrada');

    const grupoId = await resolverGrupo(client, marcaId, grupoNombre);

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
