import { query, pool } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';
import * as calcEngine from './calcEngine.js';

async function cargarContextoCatalogo() {
  const [{ rows: tecnologias }, { rows: actividades }, { rows: bloquesFijos }, { rows: parametros }, { rows: tarifas }, { rows: rangos }] = await Promise.all([
    query('SELECT * FROM catalogo_impl_tecnologias WHERE activo = true'),
    query('SELECT * FROM catalogo_impl_actividades ORDER BY tecnologia_id, orden'),
    query('SELECT * FROM catalogo_impl_bloques_fijos ORDER BY tipo, orden'),
    query('SELECT clave, valor FROM catalogo_impl_parametros'),
    query('SELECT nivel, condicion, tarifa_cop_hora FROM catalogo_impl_tarifas'),
    query('SELECT * FROM catalogo_impl_site_survey_rangos'),
  ]);

  const tecnologiasById = {};
  tecnologias.forEach((t) => { tecnologiasById[t.id] = t; });

  const actividadesPorTecnologia = {};
  actividades.forEach((a) => { (actividadesPorTecnologia[a.tecnologia_id] ||= []).push(a); });

  const params = {};
  parametros.forEach((p) => { params[p.clave] = Number(p.valor); });

  const tarifasPorCondicion = { interno: {}, aliado: {} };
  tarifas.forEach((t) => { tarifasPorCondicion[t.condicion][t.nivel] = Number(t.tarifa_cop_hora); });

  const rangosById = {};
  rangos.forEach((r) => { rangosById[r.id] = r; });

  return { tecnologiasById, actividadesPorTecnologia, bloquesFijos, params, tarifasPorCondicion, rangosById };
}

function mapSedeEntrada(s) {
  return {
    nombre: s.nombre,
    ingenieros: s.ingenieros,
    dias: s.dias,
    alimentacionDia: s.alimentacionDia,
    hospedajeDia: s.hospedajeDia,
    transporteInternoDia: s.transporteInternoDia,
    transporteAeropuerto: s.transporteAeropuerto,
    vuelo: s.vuelo,
    esLocal: !!s.esLocal,
  };
}

export async function getCotizacion(bomId) {
  const { rows } = await query('SELECT * FROM cotizaciones_impl WHERE bom_id = $1', [bomId]);
  if (rows.length === 0) return null;
  const cotizacion = rows[0];

  const [{ rows: sedes }, { rows: tecnologiasSeleccionadas }, { rows: siteSurveySedes }, { rows: resultadoRows }] = await Promise.all([
    query('SELECT * FROM cotizaciones_impl_sedes WHERE cotizacion_id = $1 ORDER BY id', [cotizacion.id]),
    query(
      `SELECT ts.tecnologia_id, ts.factor_equipos, t.nombre AS tecnologia_nombre
       FROM cotizaciones_impl_tecnologias_seleccionadas ts
       JOIN catalogo_impl_tecnologias t ON t.id = ts.tecnologia_id
       WHERE ts.cotizacion_id = $1`,
      [cotizacion.id]
    ),
    query(
      `SELECT ss.id, ss.nombre_sede, ss.rango_id, r.etiqueta
       FROM cotizaciones_impl_site_survey_sedes ss
       JOIN catalogo_impl_site_survey_rangos r ON r.id = ss.rango_id
       WHERE ss.cotizacion_id = $1`,
      [cotizacion.id]
    ),
    query('SELECT * FROM cotizaciones_impl_resultado WHERE cotizacion_id = $1', [cotizacion.id]),
  ]);

  return {
    ...cotizacion,
    sedes,
    tecnologiasSeleccionadas,
    siteSurveySedes,
    resultado: resultadoRows[0] || null,
  };
}

export async function upsertYCalcular(bomId, data, userId) {
  const {
    modo, nivelIngenieria = 2, condicion = 'interno', numeroPlantas = 1, trm,
    bolsaHorasActiva = false, siteSurveyActivo = false,
    sedes = [], tecnologiasSeleccionadas = [], siteSurveySedes = [],
  } = data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO cotizaciones_impl (bom_id, modo, nivel_ingenieria, condicion, numero_plantas, trm, bolsa_horas_activa, site_survey_activo, creado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (bom_id) DO UPDATE SET
         modo = EXCLUDED.modo, nivel_ingenieria = EXCLUDED.nivel_ingenieria, condicion = EXCLUDED.condicion,
         numero_plantas = EXCLUDED.numero_plantas, trm = EXCLUDED.trm,
         bolsa_horas_activa = EXCLUDED.bolsa_horas_activa, site_survey_activo = EXCLUDED.site_survey_activo,
         actualizado_en = now()
       RETURNING id`,
      [bomId, modo, nivelIngenieria, condicion, numeroPlantas, trm || null, bolsaHorasActiva, siteSurveyActivo, userId]
    );
    const cotizacionId = rows[0].id;

    await client.query('DELETE FROM cotizaciones_impl_sedes WHERE cotizacion_id = $1', [cotizacionId]);
    for (const s of sedes) {
      await client.query(
        `INSERT INTO cotizaciones_impl_sedes (cotizacion_id, nombre, ingenieros, dias, alimentacion_dia, hospedaje_dia, transporte_interno_dia, transporte_aeropuerto, vuelo, es_local)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [cotizacionId, s.nombre, s.ingenieros, s.dias, s.alimentacionDia, s.hospedajeDia, s.transporteInternoDia, s.transporteAeropuerto, s.vuelo, !!s.esLocal]
      );
    }

    await client.query('DELETE FROM cotizaciones_impl_tecnologias_seleccionadas WHERE cotizacion_id = $1', [cotizacionId]);
    for (const t of tecnologiasSeleccionadas) {
      await client.query(
        `INSERT INTO cotizaciones_impl_tecnologias_seleccionadas (cotizacion_id, tecnologia_id, factor_equipos) VALUES ($1,$2,$3)`,
        [cotizacionId, t.tecnologiaId, t.factorEquipos]
      );
    }

    await client.query('DELETE FROM cotizaciones_impl_site_survey_sedes WHERE cotizacion_id = $1', [cotizacionId]);
    for (const s of siteSurveySedes) {
      await client.query(
        `INSERT INTO cotizaciones_impl_site_survey_sedes (cotizacion_id, nombre_sede, rango_id) VALUES ($1,$2,$3)`,
        [cotizacionId, s.nombreSede, s.rangoId]
      );
    }

    const catalogo = await cargarContextoCatalogo();
    const sedesCtx = sedes.map(mapSedeEntrada);
    const tecCtx = tecnologiasSeleccionadas.map((t) => ({ tecnologiaId: t.tecnologiaId, factorEquipos: t.factorEquipos }));

    let resultado;
    if (modo === 'epsp') {
      resultado = calcEngine.recalcularEpsp({
        params: catalogo.params,
        sedes: sedesCtx,
        bolsaHorasActiva,
        tecnologiasSeleccionadas: tecCtx,
        tecnologiasById: catalogo.tecnologiasById,
        actividadesPorTecnologia: catalogo.actividadesPorTecnologia,
        bloquesFijos: catalogo.bloquesFijos,
        numeroPlantas,
        trm,
      });
    } else {
      const tarifa = catalogo.tarifasPorCondicion[condicion][nivelIngenieria];
      const tarifaNivel2 = catalogo.tarifasPorCondicion[condicion][2];
      resultado = calcEngine.recalcularNetmask({
        params: catalogo.params,
        sedes: sedesCtx,
        bolsaHorasActiva,
        siteSurveyActivo,
        siteSurveySedes: siteSurveySedes.map((s) => ({ rangoId: s.rangoId })),
        rangosById: catalogo.rangosById,
        tecnologiasSeleccionadas: tecCtx,
        tecnologiasById: catalogo.tecnologiasById,
        actividadesPorTecnologia: catalogo.actividadesPorTecnologia,
        bloquesFijos: catalogo.bloquesFijos,
        numeroPlantas,
        tarifa,
        tarifaNivel2,
      });
    }

    await client.query(
      `INSERT INTO cotizaciones_impl_resultado (cotizacion_id, total_horas, pm_horas, dias_epsp_trabajo, dias_epsp_viaticos, total_dias_epsp, viaticos_cop, viaticos_usd, costo_ingenieria_cop, total_cop, detalle_calculo, calculado_en)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (cotizacion_id) DO UPDATE SET
         total_horas = EXCLUDED.total_horas, pm_horas = EXCLUDED.pm_horas,
         dias_epsp_trabajo = EXCLUDED.dias_epsp_trabajo, dias_epsp_viaticos = EXCLUDED.dias_epsp_viaticos, total_dias_epsp = EXCLUDED.total_dias_epsp,
         viaticos_cop = EXCLUDED.viaticos_cop, viaticos_usd = EXCLUDED.viaticos_usd,
         costo_ingenieria_cop = EXCLUDED.costo_ingenieria_cop, total_cop = EXCLUDED.total_cop,
         detalle_calculo = EXCLUDED.detalle_calculo, calculado_en = now()`,
      [
        cotizacionId, resultado.totalHoras, resultado.pmHoras, resultado.diasEpspTrabajo, resultado.diasEpspViaticos, resultado.totalDiasEpsp,
        resultado.viaticosCop, resultado.viaticosUsd, resultado.costoIngenieriaCop, resultado.totalCop, JSON.stringify(resultado),
      ]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return getCotizacion(bomId);
}

export async function eliminarCotizacion(bomId) {
  const { rows } = await query('DELETE FROM cotizaciones_impl WHERE bom_id = $1 RETURNING id', [bomId]);
  if (rows.length === 0) throw new HttpError(404, 'Este BOM no tiene componente de Implementación');
}
