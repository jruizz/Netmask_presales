import { query } from '../../db/pool.js';

export async function listTipos() {
  const { rows: tipos } = await query('SELECT * FROM catalogo_serv_tipos WHERE activo = true ORDER BY nombre');
  const { rows: niveles } = await query('SELECT * FROM catalogo_serv_escalamiento_niveles ORDER BY plantilla_id, orden');
  const nivelesPorPlantilla = {};
  niveles.forEach((n) => { (nivelesPorPlantilla[n.plantilla_id] ||= []).push(n); });
  return tipos.map((t) => ({
    ...t,
    escalamientoDefault: t.plantilla_escalamiento_default_id ? (nivelesPorPlantilla[t.plantilla_escalamiento_default_id] || []) : [],
  }));
}

export async function listCategoriasTecnologia() {
  const { rows } = await query('SELECT * FROM catalogo_serv_categorias_tecnologia ORDER BY orden');
  return rows;
}

export async function listNiveles() {
  const { rows } = await query('SELECT * FROM catalogo_serv_niveles ORDER BY orden');
  return rows;
}

export async function listSeveridades() {
  const { rows } = await query('SELECT * FROM catalogo_serv_severidades ORDER BY orden');
  return rows;
}
