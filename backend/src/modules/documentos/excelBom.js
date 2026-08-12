import ExcelJS from 'exceljs';
import {
  estiloEncabezado, estiloTotal, conBorde, bordePorFila,
  escribirEncabezadoProyecto, escribirViaticosPorSede, escribirDetalleCotizacion,
  NUMFMT_DECIMAL,
} from './excelCotizacion.js';

// Agrupa subtotales de hardware por moneda -- nunca se suma COP con USD como si
// fueran lo mismo (ver troubleshooting agosto 2026: el selector de moneda del
// catalogo de Hardware antes no se usaba en ningun total).
function agruparPorMoneda(hardwareItems) {
  const porMoneda = {};
  hardwareItems.forEach((it) => {
    const m = it.moneda || 'COP';
    porMoneda[m] = (porMoneda[m] || 0) + Number(it.subtotal);
  });
  return porMoneda;
}

export async function generarExcelBom({ bom, cliente, hardwareItems, cotizacion, especificacion, tipoServicioNombre }) {
  const wb = new ExcelJS.Workbook();

  if (hardwareItems.length) {
    const hw = wb.addWorksheet('Hardware');
    hw.columns = [
      { key: 'item', width: 8 }, { key: 'nombre', width: 30 }, { key: 'descripcion', width: 45 },
      { key: 'cantidad', width: 12 }, { key: 'precio', width: 16 }, { key: 'moneda', width: 10 }, { key: 'subtotal', width: 16 },
    ];

    let r = escribirEncabezadoProyecto(hw, 1, { titulo: `BOM — ${bom.nombre}`, cliente, bom, colFin: 7 });

    const headerRow = hw.getRow(r);
    ['Item', 'Referencia', 'Descripción', 'Cantidad', 'Costo unitario', 'Moneda', 'Total'].forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      estiloEncabezado(cell);
    });
    r++;

    hardwareItems.forEach((it, i) => {
      const row = hw.getRow(r);
      row.getCell(1).value = i + 1;
      row.getCell(2).value = it.nombre;
      row.getCell(3).value = it.descripcion || '—';
      row.getCell(4).value = Number(it.cantidad);
      row.getCell(5).value = Number(it.precio_unitario_snapshot);
      row.getCell(5).numFmt = NUMFMT_DECIMAL;
      row.getCell(6).value = it.moneda || 'COP';
      row.getCell(7).value = Number(it.subtotal);
      row.getCell(7).numFmt = NUMFMT_DECIMAL;
      bordePorFila(row, 1, 7);
      r++;
    });

    const totalesPorMoneda = agruparPorMoneda(hardwareItems);
    Object.entries(totalesPorMoneda).forEach(([moneda, total]) => {
      const row = hw.getRow(r);
      row.getCell(2).value = `TOTAL ${moneda}`;
      row.getCell(7).value = total;
      row.getCell(7).numFmt = NUMFMT_DECIMAL;
      bordePorFila(row, 1, 7);
      for (let c = 1; c <= 7; c++) estiloTotal(row.getCell(c));
      r++;
    });
    r++;

    if (bom.notas) {
      hw.getCell(r, 1).value = 'Comentarios';
      estiloEncabezado(hw.getCell(r, 1));
      hw.mergeCells(r, 1, r, 7);
      r++;
      String(bom.notas).split('\n').forEach((linea) => {
        hw.getCell(r, 1).value = linea;
        hw.mergeCells(r, 1, r, 7);
        hw.getRow(r).alignment = { wrapText: true };
        bordePorFila(hw.getRow(r), 1, 7);
        r++;
      });
    }
  }

  if (cotizacion) {
    const wsImpl = wb.addWorksheet('Implementación');
    wsImpl.columns = [
      { key: 'texto', width: 55 }, { key: 'cantidad', width: 14 }, { key: 'horas', width: 12 },
      { key: 'totalHoras', width: 14 }, { key: 'modo', width: 12 }, { key: 'costoHora', width: 16 },
      { key: 'c7', width: 14 }, { key: 'c8', width: 14 }, { key: 'c9', width: 14 }, { key: 'c10', width: 14 }, { key: 'c11', width: 10 },
    ];

    let r = escribirEncabezadoProyecto(wsImpl, 1, { titulo: `Implementación — ${bom.nombre}`, cliente, bom, colFin: 11 });

    if (cotizacion.resultado.detalle_calculo.viaticosPorSede?.length) {
      r = escribirViaticosPorSede(wsImpl, r, cotizacion.resultado.detalle_calculo.viaticosPorSede);
    }

    const tarifa = cotizacion.modo === 'netmask' ? Number(cotizacion.resultado.detalle_calculo.tarifa) : undefined;
    escribirDetalleCotizacion(wsImpl, r, cotizacion, { tarifa });
  }

  // BOM con solo Servicios Netmask (sin Hardware ni Implementacion): ninguna de
  // las hojas de arriba se crea -- se deja una hoja minima para que el archivo
  // nunca quede vacio (ExcelJS no permite un workbook sin hojas).
  if (wb.worksheets.length === 0) {
    const ws = wb.addWorksheet('BOM');
    ws.columns = [{ key: 'a', width: 30 }, { key: 'b', width: 40 }];
    let r = escribirEncabezadoProyecto(ws, 1, { titulo: `BOM — ${bom.nombre}`, cliente, bom, colFin: 2 });
    ws.getCell(r, 1).value = 'Servicio Netmask';
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 2).value = especificacion
      ? `${tipoServicioNombre} (sin valor tarifado — ver Propuesta Técnica / especificación)`
      : 'No incluido en este BOM';
    bordePorFila(ws.getRow(r), 1, 2);
  }

  return wb.xlsx.writeBuffer();
}
