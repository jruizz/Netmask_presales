import ExcelJS from 'exceljs';

const AZUL_OSCURO = 'FF07182D';
const AZUL_CLARO = 'FF0094CE';
const GRIS_CLARO = 'FFF2F2F2';
const CELESTE_TOTAL = 'FFD6EFFA';
const BORDE_GRIS = { style: 'thin', color: { argb: 'FF9AA5B1' } };

const EXCLUSIONES_IMPL = [
  'Instalación de cableado estructurado o adecuaciones eléctricas',
  'Suministro de hardware, licenciamiento o renovaciones no especificadas',
  'Integración con SIEM, SOC o herramientas de terceros no mencionadas en el alcance',
  'Soporte o administración posterior a la entrega (ver Servicios Netmask)',
];

export function estiloEncabezado(cell) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_OSCURO } };
  conBorde(cell);
}

// Resalta filas de total (subtotales, gran total) -- version en paleta Netmask
// del verde que usan las plantillas reales de referencia (BOM VEOLIA / Servicios
// de Ingenieria Veolia), que usan colores de marca Fortinet/arbitrarios.
export function estiloTotal(cell) {
  cell.font = { bold: true, color: { argb: AZUL_OSCURO } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CELESTE_TOTAL } };
  conBorde(cell);
}

export function conBorde(cell) {
  cell.border = { top: BORDE_GRIS, left: BORDE_GRIS, bottom: BORDE_GRIS, right: BORDE_GRIS };
}

export function bordePorFila(row, colInicio, colFin) {
  for (let c = colInicio; c <= colFin; c++) conBorde(row.getCell(c));
}

// Encabezado compartido por todas las hojas de documentos generados (BOM,
// Cotizacion de Implementacion): titulo + Cliente + Account Manager, igual a
// como las plantillas reales de Veolia identifican cada cotizacion.
export function escribirEncabezadoProyecto(ws, r, { titulo, cliente, bom, colFin = 6 }) {
  ws.mergeCells(r, 1, r, colFin);
  ws.getCell(r, 1).value = titulo;
  estiloEncabezado(ws.getCell(r, 1));
  ws.getRow(r).height = 22;
  r++;

  ws.getCell(r, 1).value = 'Cliente';
  ws.getCell(r, 1).font = { bold: true };
  ws.getCell(r, 2).value = cliente.nombre_cliente;
  bordePorFila(ws.getRow(r), 1, 2);
  r++;

  ws.getCell(r, 1).value = 'Account Manager';
  ws.getCell(r, 1).font = { bold: true };
  ws.getCell(r, 2).value = bom.comercial_nombre || '—';
  bordePorFila(ws.getRow(r), 1, 2);
  r++;

  return r + 1;
}

// Desglose de viaticos por sede, para el Excel de Cotizacion (tabla "Viaticos para
// la Implementacion" del formato real) y para calcViaticosCOP (que ahora solo suma
// esto, en vez de duplicar la formula).
export function escribirViaticosPorSede(ws, r, viaticosPorSede) {
  ws.getCell(r, 1).value = 'Viáticos para la Implementación';
  estiloEncabezado(ws.getCell(r, 1));
  ws.mergeCells(r, 1, r, 11);
  r++;

  const headers = ['Sede', 'Total Viáticos', 'Total Viáticos por visita', 'Cant. Ing.', 'Vuelos', 'Tiempo en sitio', 'Alimentación', 'Hospedaje', 'Transp. interno', 'Transp. Aeropuerto', 'Local'];
  const headerRow = ws.getRow(r);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    estiloEncabezado(cell);
  });
  r++;

  viaticosPorSede.forEach((s) => {
    const row = ws.getRow(r);
    row.getCell(1).value = s.nombre;
    row.getCell(2).value = s.totalViaticos;
    row.getCell(2).numFmt = '#,##0';
    row.getCell(3).value = s.totalViaticosPorVisita;
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).value = s.cantIngenieros;
    row.getCell(5).value = s.vuelos;
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).value = s.tiempoEnSitio;
    row.getCell(7).value = s.alimentacion;
    row.getCell(7).numFmt = '#,##0';
    row.getCell(8).value = s.hospedaje;
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).value = s.transporteInterno;
    row.getCell(9).numFmt = '#,##0';
    row.getCell(10).value = s.transporteAeropuerto;
    row.getCell(10).numFmt = '#,##0';
    row.getCell(11).value = s.esLocal ? 'Sí' : 'No';
    bordePorFila(row, 1, 11);
    r++;
  });

  const totalRow = ws.getRow(r);
  totalRow.getCell(1).value = 'Total viáticos';
  totalRow.getCell(2).value = viaticosPorSede.reduce((t, s) => t + s.totalViaticos, 0);
  totalRow.getCell(2).numFmt = '#,##0';
  bordePorFila(totalRow, 1, 2);
  estiloTotal(totalRow.getCell(1));
  estiloTotal(totalRow.getCell(2));
  r += 2;
  return r;
}

// Escribe el desglose de bloques/actividades + totales de una cotizacion de
// implementacion a partir de la fila `r`. Se reutiliza tanto en el Excel
// individual de la cotizacion como en el Excel BOM consolidado.
// `tarifa`: si se pasa (modo Netmask), agrega la columna "Costo Hora" con el
// valor monetario de cada actividad (horas x tarifa).
export function escribirDetalleCotizacion(ws, r, cotizacion, { tarifa } = {}) {
  const detalle = cotizacion.resultado.detalle_calculo;
  const conCosto = !!tarifa;
  const colFin = conCosto ? 6 : 5;

  const headerRow = ws.getRow(r);
  const headers = conCosto
    ? ['Bloque / Actividad', 'Cant.', 'Horas', 'Total Horas', 'Modalidad', 'Costo Hora']
    : ['Bloque / Actividad', 'Cant.', 'Horas', 'Total Horas', 'Modalidad'];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    estiloEncabezado(cell);
  });
  r++;

  detalle.blocks.forEach((block) => {
    const row = ws.getRow(r);
    row.getCell(1).value = block.titulo;
    row.getCell(4).value = block.subtotalHoras;
    if (conCosto) { row.getCell(6).value = block.subtotalHoras * tarifa; row.getCell(6).numFmt = '#,##0'; }
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      if (colNum > colFin) return;
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_CLARO } };
      conBorde(cell);
    });
    r++;
    block.items.forEach((it) => {
      const row2 = ws.getRow(r);
      row2.getCell(1).value = it.texto + (it.unitario ? ' (único por proyecto)' : '');
      row2.getCell(2).value = it.cantidad;
      row2.getCell(3).value = it.horas;
      row2.getCell(4).value = it.cantidad * it.horas;
      row2.getCell(5).value = it.modo === 'en_sitio' ? 'En sitio' : 'Remota';
      if (conCosto) { row2.getCell(6).value = it.cantidad * it.horas * tarifa; row2.getCell(6).numFmt = '#,##0'; }
      bordePorFila(row2, 1, colFin);
      r++;
    });
  });

  const pmRow = ws.getRow(r);
  pmRow.getCell(1).value = detalle.pmHoras > 0 ? 'Gerencia de Proyectos (8%, >24h)' : 'Gerencia de Proyectos (no aplica, ≤24h)';
  pmRow.getCell(4).value = detalle.pmHoras;
  if (conCosto) { pmRow.getCell(6).value = detalle.pmHoras * tarifa; pmRow.getCell(6).numFmt = '#,##0'; }
  bordePorFila(pmRow, 1, colFin);
  pmRow.eachCell({ includeEmpty: true }, (cell, colNum) => { if (colNum <= colFin) cell.font = { italic: true }; });
  r += 2;

  const totalesInicio = r;
  ws.getCell(r, 1).value = 'Horas totales (con PM)';
  ws.getCell(r, 2).value = Number(cotizacion.resultado.total_horas);
  r++;
  ws.getCell(r, 1).value = 'Viáticos';
  ws.getCell(r, 2).value = Number(cotizacion.resultado.viaticos_cop);
  ws.getCell(r, 2).numFmt = '#,##0';
  r++;

  if (cotizacion.modo === 'epsp') {
    ws.getCell(r, 1).value = 'Días EPSP — trabajo';
    ws.getCell(r, 2).value = Number(cotizacion.resultado.dias_epsp_trabajo);
    r++;
    ws.getCell(r, 1).value = 'Días EPSP — viáticos';
    ws.getCell(r, 2).value = Number(cotizacion.resultado.dias_epsp_viaticos);
    r++;
    ws.getCell(r, 1).value = 'TOTAL DÍAS EPSP';
    ws.getCell(r, 2).value = Number(cotizacion.resultado.total_dias_epsp);
  } else {
    ws.getCell(r, 1).value = 'Costo de ingeniería';
    ws.getCell(r, 2).value = Number(cotizacion.resultado.costo_ingenieria_cop);
    ws.getCell(r, 2).numFmt = '#,##0';
    r++;
    ws.getCell(r, 1).value = 'TOTAL NETMASK (COP)';
    ws.getCell(r, 2).value = Number(cotizacion.resultado.total_cop);
    ws.getCell(r, 2).numFmt = '#,##0';
  }
  for (let i = totalesInicio; i <= r; i++) {
    const esGranTotal = i === r;
    const row = ws.getRow(i);
    if (esGranTotal) {
      estiloTotal(row.getCell(1));
      estiloTotal(row.getCell(2));
    } else {
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true, color: { argb: AZUL_CLARO } };
      bordePorFila(row, 1, 2);
    }
  }
  return r + 1;
}

function escribirAlcanceYExclusiones(ws, r, cotizacion) {
  ws.getCell(r, 1).value = 'Alcance';
  estiloEncabezado(ws.getCell(r, 1));
  ws.mergeCells(r, 1, r, 5);
  r++;
  cotizacion.resultado.detalle_calculo.blocks
    .filter((b) => b.titulo.startsWith('IMPLEMENTACION'))
    .forEach((b) => {
      ws.getCell(r, 1).value = `• ${b.titulo.replace('IMPLEMENTACION - ', '')}`;
      bordePorFila(ws.getRow(r), 1, 5);
      r++;
    });
  r++;

  ws.getCell(r, 1).value = 'Exclusiones';
  estiloEncabezado(ws.getCell(r, 1));
  ws.mergeCells(r, 1, r, 5);
  r++;
  EXCLUSIONES_IMPL.forEach((texto) => {
    ws.getCell(r, 1).value = `• ${texto}`;
    bordePorFila(ws.getRow(r), 1, 5);
    r++;
  });
  return r;
}

export async function generarExcelCotizacion({ bom, cliente, cotizacion }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Cotización Implementación');
  ws.columns = [
    { key: 'texto', width: 55 }, { key: 'cantidad', width: 14 }, { key: 'horas', width: 12 },
    { key: 'totalHoras', width: 14 }, { key: 'modo', width: 12 }, { key: 'costoHora', width: 16 },
    { key: 'c7', width: 14 }, { key: 'c8', width: 14 }, { key: 'c9', width: 14 }, { key: 'c10', width: 14 }, { key: 'c11', width: 10 },
  ];

  let r = escribirEncabezadoProyecto(ws, 1, { titulo: `Cotización de Implementación — ${bom.nombre}`, cliente, bom, colFin: 11 });
  ws.getCell(r, 1).value = 'Modo';
  ws.getCell(r, 1).font = { bold: true };
  ws.getCell(r, 2).value = cotizacion.modo === 'epsp' ? 'Servicio EPSP (TD Synnex/Fortinet)' : 'Servicio Netmask';
  bordePorFila(ws.getRow(r), 1, 2);
  r++;
  ws.getCell(r, 1).value = 'Nivel de ingeniería';
  ws.getCell(r, 1).font = { bold: true };
  ws.getCell(r, 2).value = `Nivel ${cotizacion.nivel_ingenieria} (${cotizacion.condicion})`;
  bordePorFila(ws.getRow(r), 1, 2);
  r += 2;

  if (cotizacion.resultado.detalle_calculo.viaticosPorSede?.length) {
    r = escribirViaticosPorSede(ws, r, cotizacion.resultado.detalle_calculo.viaticosPorSede);
  }

  const tarifa = cotizacion.modo === 'netmask' ? Number(cotizacion.resultado.detalle_calculo.tarifa) : undefined;
  r = escribirDetalleCotizacion(ws, r, cotizacion, { tarifa });
  r++;
  escribirAlcanceYExclusiones(ws, r, cotizacion);

  return wb.xlsx.writeBuffer();
}
