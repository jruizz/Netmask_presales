import ExcelJS from 'exceljs';

const AZUL_OSCURO = 'FF07182D';
const AZUL_CLARO = 'FF0094CE';
const GRIS_CLARO = 'FFF2F2F2';

const EXCLUSIONES_IMPL = [
  'Instalación de cableado estructurado o adecuaciones eléctricas',
  'Suministro de hardware, licenciamiento o renovaciones no especificadas',
  'Integración con SIEM, SOC o herramientas de terceros no mencionadas en el alcance',
  'Soporte o administración posterior a la entrega (ver Servicios Netmask)',
];

export function estiloEncabezado(cell) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_OSCURO } };
}

// Tabla "Viaticos para la Implementacion", una fila por sede — formato real
// (Servicios de Ingenieria), a partir del desglose que ya calcula calcEngine.js.
function escribirViaticosPorSede(ws, r, viaticosPorSede) {
  ws.getCell(`A${r}`).value = 'Viáticos para la Implementación';
  estiloEncabezado(ws.getCell(`A${r}`));
  ws.mergeCells(r, 1, r, 9);
  r++;

  const headers = ['Sede', 'Total Viáticos', 'Total Viáticos por visita', 'Cant. Ing.', 'Vuelos', 'Tiempo en sitio', 'Alimentación', 'Hospedaje', 'Transp. interno'];
  headers.forEach((h, i) => {
    const cell = ws.getRow(r).getCell(i + 1);
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
    r++;
  });

  const totalRow = ws.getRow(r);
  totalRow.getCell(1).value = 'Total viáticos';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(2).value = viaticosPorSede.reduce((t, s) => t + s.totalViaticos, 0);
  totalRow.getCell(2).numFmt = '#,##0';
  totalRow.getCell(2).font = { bold: true, color: { argb: AZUL_CLARO } };
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
    row.eachCell((cell) => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_CLARO } }; });
    r++;
    block.items.forEach((it) => {
      const row2 = ws.getRow(r);
      row2.getCell(1).value = it.texto + (it.unitario ? ' (único por proyecto)' : '');
      row2.getCell(2).value = it.cantidad;
      row2.getCell(3).value = it.horas;
      row2.getCell(4).value = it.cantidad * it.horas;
      row2.getCell(5).value = it.modo === 'en_sitio' ? 'En sitio' : 'Remota';
      if (conCosto) { row2.getCell(6).value = it.cantidad * it.horas * tarifa; row2.getCell(6).numFmt = '#,##0'; }
      r++;
    });
  });

  const pmRow = ws.getRow(r);
  pmRow.getCell(1).value = detalle.pmHoras > 0 ? 'Gerencia de Proyectos (8%, >24h)' : 'Gerencia de Proyectos (no aplica, ≤24h)';
  pmRow.getCell(4).value = detalle.pmHoras;
  if (conCosto) { pmRow.getCell(6).value = detalle.pmHoras * tarifa; pmRow.getCell(6).numFmt = '#,##0'; }
  pmRow.eachCell((cell) => { cell.font = { italic: true }; });
  r += 2;

  const totalesInicio = r;
  ws.getCell(`A${r}`).value = 'Horas totales (con PM)';
  ws.getCell(`B${r}`).value = Number(cotizacion.resultado.total_horas);
  r++;
  ws.getCell(`A${r}`).value = 'Viáticos';
  ws.getCell(`B${r}`).value = Number(cotizacion.resultado.viaticos_cop);
  ws.getCell(`B${r}`).numFmt = '#,##0';
  r++;

  if (cotizacion.modo === 'epsp') {
    ws.getCell(`A${r}`).value = 'Días EPSP — trabajo';
    ws.getCell(`B${r}`).value = Number(cotizacion.resultado.dias_epsp_trabajo);
    r++;
    ws.getCell(`A${r}`).value = 'Días EPSP — viáticos';
    ws.getCell(`B${r}`).value = Number(cotizacion.resultado.dias_epsp_viaticos);
    r++;
    ws.getCell(`A${r}`).value = 'TOTAL DÍAS EPSP';
    ws.getCell(`B${r}`).value = Number(cotizacion.resultado.total_dias_epsp);
  } else {
    ws.getCell(`A${r}`).value = 'Costo de ingeniería';
    ws.getCell(`B${r}`).value = Number(cotizacion.resultado.costo_ingenieria_cop);
    ws.getCell(`B${r}`).numFmt = '#,##0';
    r++;
    ws.getCell(`A${r}`).value = 'TOTAL NETMASK (COP)';
    ws.getCell(`B${r}`).value = Number(cotizacion.resultado.total_cop);
    ws.getCell(`B${r}`).numFmt = '#,##0';
  }
  for (let i = totalesInicio; i <= r; i++) {
    ws.getCell(`A${i}`).font = { bold: true };
    ws.getCell(`B${i}`).font = { bold: true, color: { argb: AZUL_CLARO } };
  }
  return r + 1;
}

function escribirAlcanceYExclusiones(ws, r, cotizacion) {
  ws.getCell(`A${r}`).value = 'Alcance';
  estiloEncabezado(ws.getCell(`A${r}`));
  ws.mergeCells(r, 1, r, 5);
  r++;
  cotizacion.resultado.detalle_calculo.blocks
    .filter((b) => b.titulo.startsWith('IMPLEMENTACION'))
    .forEach((b) => { ws.getCell(`A${r}`).value = `• ${b.titulo.replace('IMPLEMENTACION - ', '')}`; r++; });
  r++;

  ws.getCell(`A${r}`).value = 'Exclusiones';
  estiloEncabezado(ws.getCell(`A${r}`));
  ws.mergeCells(r, 1, r, 5);
  r++;
  EXCLUSIONES_IMPL.forEach((texto) => { ws.getCell(`A${r}`).value = `• ${texto}`; r++; });
  return r;
}

export async function generarExcelCotizacion({ bom, cliente, cotizacion }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Cotización Implementación');
  ws.columns = [
    { key: 'texto', width: 55 },
    { key: 'cantidad', width: 12 },
    { key: 'horas', width: 10 },
    { key: 'totalHoras', width: 14 },
    { key: 'modo', width: 12 },
    { key: 'costoHora', width: 16 },
  ];

  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = `Cotización de Implementación — ${bom.nombre}`;
  estiloEncabezado(ws.getCell('A1'));
  ws.getRow(1).height = 22;

  ws.getCell('A2').value = 'Cliente';
  ws.getCell('B2').value = cliente.nombre_cliente;
  ws.getCell('A3').value = 'Account Manager';
  ws.getCell('B3').value = bom.comercial_nombre || '—';
  ws.getCell('A4').value = 'Modo';
  ws.getCell('B4').value = cotizacion.modo === 'epsp' ? 'Servicio EPSP (TD Synnex/Fortinet)' : 'Servicio Netmask';
  ws.getCell('A5').value = 'Nivel de ingeniería';
  ws.getCell('B5').value = `Nivel ${cotizacion.nivel_ingenieria} (${cotizacion.condicion})`;

  let r = 7;
  if (cotizacion.resultado.detalle_calculo.viaticosPorSede?.length) {
    r = escribirViaticosPorSede(ws, r, cotizacion.resultado.detalle_calculo.viaticosPorSede);
  }

  const tarifa = cotizacion.modo === 'netmask' ? Number(cotizacion.resultado.detalle_calculo.tarifa) : undefined;
  r = escribirDetalleCotizacion(ws, r, cotizacion, { tarifa });
  r++;
  escribirAlcanceYExclusiones(ws, r, cotizacion);

  return wb.xlsx.writeBuffer();
}
