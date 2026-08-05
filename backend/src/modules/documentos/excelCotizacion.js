import ExcelJS from 'exceljs';

const AZUL_OSCURO = 'FF07182D';
const AZUL_CLARO = 'FF0094CE';
const GRIS_CLARO = 'FFF2F2F2';

export function estiloEncabezado(cell) {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_OSCURO } };
}

// Escribe el desglose de bloques/actividades + totales de una cotizacion de
// implementacion a partir de la fila `r`. Se reutiliza tanto en el Excel
// individual de la cotizacion como en el Excel BOM consolidado.
export function escribirDetalleCotizacion(ws, r, cotizacion) {
  const detalle = cotizacion.resultado.detalle_calculo;

  const headerRow = ws.getRow(r);
  ['Bloque / Actividad', 'Cant.', 'Horas', 'Total Horas', 'Modalidad'].forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    estiloEncabezado(cell);
  });
  r++;

  detalle.blocks.forEach((block) => {
    const row = ws.getRow(r);
    row.getCell(1).value = block.titulo;
    row.getCell(4).value = block.subtotalHoras;
    row.eachCell((cell) => { cell.font = { bold: true }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_CLARO } }; });
    r++;
    block.items.forEach((it) => {
      const row2 = ws.getRow(r);
      row2.getCell(1).value = it.texto + (it.unitario ? ' (único por proyecto)' : '');
      row2.getCell(2).value = it.cantidad;
      row2.getCell(3).value = it.horas;
      row2.getCell(4).value = it.cantidad * it.horas;
      row2.getCell(5).value = it.modo === 'en_sitio' ? 'En sitio' : 'Remota';
      r++;
    });
  });

  const pmRow = ws.getRow(r);
  pmRow.getCell(1).value = detalle.pmHoras > 0 ? 'Gerencia de Proyectos (8%, >24h)' : 'Gerencia de Proyectos (no aplica, ≤24h)';
  pmRow.getCell(4).value = detalle.pmHoras;
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

export async function generarExcelCotizacion({ bom, cliente, cotizacion }) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Cotización Implementación');
  ws.columns = [
    { key: 'texto', width: 55 },
    { key: 'cantidad', width: 12 },
    { key: 'horas', width: 10 },
    { key: 'totalHoras', width: 14 },
    { key: 'modo', width: 12 },
  ];

  ws.mergeCells('A1:E1');
  ws.getCell('A1').value = `Cotización de Implementación — ${bom.nombre}`;
  estiloEncabezado(ws.getCell('A1'));
  ws.getRow(1).height = 22;

  ws.getCell('A2').value = 'Cliente';
  ws.getCell('B2').value = cliente.nombre_cliente;
  ws.getCell('A3').value = 'Modo';
  ws.getCell('B3').value = cotizacion.modo === 'epsp' ? 'Servicio EPSP (TD Synnex/Fortinet)' : 'Servicio Netmask';
  ws.getCell('A4').value = 'Nivel de ingeniería';
  ws.getCell('B4').value = `Nivel ${cotizacion.nivel_ingenieria} (${cotizacion.condicion})`;

  escribirDetalleCotizacion(ws, 6, cotizacion);

  return wb.xlsx.writeBuffer();
}
