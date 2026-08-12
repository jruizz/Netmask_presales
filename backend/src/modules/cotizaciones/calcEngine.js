// Motor de calculo puro, portado de Confg_Calculadora_SAMUEL/index.html
// (calcPM, calcViaticosPorSede, calcBolsaHoras, calcSiteSurveyTotals, buildBlocks,
// recalcEPSP, recalcNetmask). No accede a la base de datos: recibe los datos
// del catalogo ya resueltos y devuelve el resultado calculado.

export function calcPM(totalHoras, umbral, porcentaje) {
  return totalHoras > umbral ? totalHoras * porcentaje : 0;
}

export function calcBolsaHoras(sedes, horasDia) {
  return sedes.reduce((t, s) => t + s.ingenieros * s.dias * horasDia, 0);
}

// Desglose de viaticos por sede, para el Excel de Cotizacion (tabla "Viaticos para
// la Implementacion" del formato real) y para el total que consumen
// recalcularEpsp/recalcularNetmask via .reduce(...).
export function calcViaticosPorSede(sedes, tarifaLocal, bolsaActiva, horasDia) {
  return sedes.map((s) => {
    let total = 0;
    if (s.esLocal && bolsaActiva) {
      // Ya cubierto por la Bolsa de Horas: no se duplica como viatico.
      total = 0;
    } else if (s.esLocal && tarifaLocal) {
      total = s.ingenieros * s.dias * horasDia * tarifaLocal;
    } else {
      total = (s.ingenieros * s.dias * (s.alimentacionDia + s.hospedajeDia + s.transporteInternoDia) + s.vuelo + s.transporteAeropuerto) * s.ingenieros;
    }
    return {
      nombre: s.nombre,
      totalViaticos: total,
      totalViaticosPorVisita: s.ingenieros > 0 ? total / s.ingenieros : total,
      cantIngenieros: s.ingenieros,
      vuelos: s.vuelo,
      tiempoEnSitio: s.dias,
      alimentacion: s.alimentacionDia,
      hospedaje: s.hospedajeDia,
      transporteInterno: s.transporteInternoDia,
      transporteAeropuerto: s.transporteAeropuerto,
      esLocal: !!s.esLocal,
    };
  });
}

export function calcSiteSurveyTotals(siteSurveySedes, rangosById) {
  let horas = 0;
  let precioFijo = 0;
  siteSurveySedes.forEach((e) => {
    const row = rangosById[e.rangoId];
    if (!row) return;
    horas += Number(row.horas_ekahau);
    precioFijo += Number(row.precio_fijo_cop);
  });
  return { horas, precioFijo };
}

export function buildBlocks({ tecnologiasSeleccionadas, tecnologiasById, actividadesPorTecnologia, bloquesFijos, numeroPlantas }) {
  const techBlocks = [];
  tecnologiasSeleccionadas.forEach(({ tecnologiaId, factorEquipos }) => {
    if (!(factorEquipos > 0)) return;
    const tec = tecnologiasById[tecnologiaId];
    if (!tec) return;
    const actividades = actividadesPorTecnologia[tecnologiaId] || [];
    const items = actividades.map((a) => ({
      texto: a.texto,
      cantidad: factorEquipos * Number(a.unidades_por_equipo),
      horas: Number(a.horas),
      modo: a.modo,
      unitario: false,
    }));
    techBlocks.push({ titulo: `IMPLEMENTACION - ${tec.nombre}`, items });
  });

  const blocks = [];
  if (techBlocks.length > 0) {
    const planeacion = bloquesFijos.filter((b) => b.tipo === 'planeacion');
    const entrega = bloquesFijos.filter((b) => b.tipo === 'entrega');
    const aBlockItems = (rows) => rows.map((b) => ({
      texto: b.texto,
      cantidad: b.es_unitario ? 1 : numeroPlantas,
      horas: Number(b.horas),
      modo: b.modo,
      unitario: b.es_unitario,
    }));
    blocks.push({ titulo: 'PLANEACION', items: aBlockItems(planeacion) });
    blocks.push(...techBlocks);
    blocks.push({ titulo: 'ENTREGA', items: aBlockItems(entrega) });
  }
  return blocks;
}

function sumarBloques(blocks) {
  let total = 0;
  const conSubtotal = blocks.map((b) => {
    const sub = b.items.reduce((a, it) => a + it.cantidad * it.horas, 0);
    total += sub;
    return { ...b, subtotalHoras: sub };
  });
  return { blocks: conSubtotal, total };
}

export function recalcularEpsp(ctx) {
  const { params, sedes, bolsaHorasActiva, tecnologiasSeleccionadas, tecnologiasById, actividadesPorTecnologia, bloquesFijos, numeroPlantas, trm } = ctx;

  let blocks = [];
  let totalHoras = 0;
  let bolsaVal = null;
  if (bolsaHorasActiva) {
    bolsaVal = calcBolsaHoras(sedes, params.HORAS_DIA);
    totalHoras = bolsaVal;
  } else {
    const built = buildBlocks({ tecnologiasSeleccionadas, tecnologiasById, actividadesPorTecnologia, bloquesFijos, numeroPlantas });
    const sumado = sumarBloques(built);
    blocks = sumado.blocks;
    totalHoras = sumado.total;
  }

  const pm = calcPM(totalHoras, params.PM_UMBRAL_HORAS, params.PM_PORCENTAJE);
  const horasConPM = totalHoras + pm;
  const dias = horasConPM / params.HORAS_DIA;
  const diasEpspTrabajo = dias / params.FACTOR_EPSP;
  const viaticosPorSede = calcViaticosPorSede(sedes, undefined, bolsaHorasActiva, params.HORAS_DIA);
  const viaticosCop = viaticosPorSede.reduce((t, s) => t + s.totalViaticos, 0);
  const viaticosUsd = trm ? viaticosCop / trm : 0;
  const diasEpspViaticos = viaticosUsd / params.USD_DIA_EPSP;
  const totalDiasEpsp = diasEpspTrabajo + diasEpspViaticos;

  return {
    modo: 'epsp',
    totalHoras: horasConPM,
    pmHoras: pm,
    bolsaVal,
    blocks,
    diasEpspTrabajo,
    diasEpspViaticos,
    totalDiasEpsp,
    viaticosCop,
    viaticosUsd,
    viaticosPorSede,
    costoIngenieriaCop: null,
    totalCop: null,
    siteSurvey: null,
  };
}

export function recalcularNetmask(ctx) {
  const {
    params, sedes, bolsaHorasActiva, siteSurveyActivo, siteSurveySedes, rangosById,
    tecnologiasSeleccionadas, tecnologiasById, actividadesPorTecnologia, bloquesFijos,
    numeroPlantas, tarifa, tarifaNivel2,
  } = ctx;

  const disableAccordion = bolsaHorasActiva || siteSurveyActivo;
  let blocks = [];
  let techHoras = 0;
  if (!disableAccordion) {
    const built = buildBlocks({ tecnologiasSeleccionadas, tecnologiasById, actividadesPorTecnologia, bloquesFijos, numeroPlantas });
    const sumado = sumarBloques(built);
    blocks = sumado.blocks;
    techHoras = sumado.total;
  }
  const techCosto = techHoras * tarifa;

  let bolsaVal = null;
  let bolsaCosto = 0;
  if (bolsaHorasActiva) {
    bolsaVal = calcBolsaHoras(sedes, params.HORAS_DIA);
    bolsaCosto = bolsaVal * tarifa;
  }

  let siteSurvey = null;
  let ssHorasTotal = 0;
  if (siteSurveyActivo) {
    const t = calcSiteSurveyTotals(siteSurveySedes, rangosById);
    const costo = bolsaHorasActiva ? t.horas * 1.5 * tarifaNivel2 : t.precioFijo;
    ssHorasTotal = t.horas;
    siteSurvey = { horas: t.horas, precioFijo: t.precioFijo, costo, modoHoras: bolsaHorasActiva };
  }

  const totalHorasUmbral = techHoras + (bolsaVal || 0) + ssHorasTotal;
  const pm = calcPM(totalHorasUmbral, params.PM_UMBRAL_HORAS, params.PM_PORCENTAJE);
  const pmCosto = pm * tarifa;

  const costoIngenieriaCop = techCosto + bolsaCosto + (siteSurvey ? siteSurvey.costo : 0) + pmCosto;
  const viaticosPorSede = calcViaticosPorSede(sedes, tarifa, bolsaHorasActiva, params.HORAS_DIA);
  const viaticosCop = viaticosPorSede.reduce((t, s) => t + s.totalViaticos, 0);
  const totalCop = costoIngenieriaCop + viaticosCop;

  return {
    modo: 'netmask',
    tarifa,
    totalHoras: totalHorasUmbral + pm,
    pmHoras: pm,
    bolsaVal,
    blocks,
    siteSurvey,
    diasEpspTrabajo: null,
    diasEpspViaticos: null,
    totalDiasEpsp: null,
    viaticosCop,
    viaticosUsd: null,
    viaticosPorSede,
    costoIngenieriaCop,
    totalCop,
  };
}
