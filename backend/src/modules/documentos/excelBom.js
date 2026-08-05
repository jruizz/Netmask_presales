import ExcelJS from 'exceljs';
import { estiloEncabezado, escribirDetalleCotizacion } from './excelCotizacion.js';

const AZUL_CLARO = 'FF0094CE';

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

  const resumen = wb.addWorksheet('Resumen');
  resumen.columns = [{ key: 'a', width: 40 }, { key: 'b', width: 30 }];
  resumen.mergeCells('A1:B1');
  resumen.getCell('A1').value = `BOM — ${bom.nombre}`;
  estiloEncabezado(resumen.getCell('A1'));
  resumen.getRow(1).height = 22;
  resumen.getCell('A2').value = 'Cliente';
  resumen.getCell('B2').value = cliente.nombre_cliente;
  resumen.getCell('A3').value = 'Account Manager';
  resumen.getCell('B3').value = bom.comercial_nombre || '—';
  resumen.getCell('A4').value = 'Fecha';
  resumen.getCell('B4').value = new Date().toLocaleDateString('es-CO');

  let r = 6;
  const totalesPorMoneda = agruparPorMoneda(hardwareItems);
  if (hardwareItems.length) {
    resumen.getCell(`A${r}`).value = 'Hardware (subtotal)';
    resumen.getCell(`A${r}`).font = { bold: true };
    r++;
    Object.entries(totalesPorMoneda).forEach(([moneda, total]) => {
      resumen.getCell(`A${r}`).value = `  Subtotal ${moneda}`;
      resumen.getCell(`B${r}`).value = total;
      resumen.getCell(`B${r}`).numFmt = '#,##0.00';
      r++;
    });
  } else {
    resumen.getCell(`A${r}`).value = 'Hardware';
    resumen.getCell(`B${r}`).value = 'No incluido en este BOM';
    r++;
  }

  let totalGeneralCop = totalesPorMoneda.COP || 0;
  if (cotizacion) {
    if (cotizacion.modo === 'netmask') {
      resumen.getCell(`A${r}`).value = 'Implementación (costo ingeniería + viáticos, COP)';
      resumen.getCell(`B${r}`).value = Number(cotizacion.resultado.total_cop);
      resumen.getCell(`B${r}`).numFmt = '#,##0';
      totalGeneralCop += Number(cotizacion.resultado.total_cop);
    } else {
      resumen.getCell(`A${r}`).value = 'Implementación (modo EPSP — sin valor monetario, ver hoja Implementación)';
      resumen.getCell(`B${r}`).value = `${Number(cotizacion.resultado.total_dias_epsp).toFixed(2)} días EPSP`;
    }
  } else {
    resumen.getCell(`A${r}`).value = 'Implementación';
    resumen.getCell(`B${r}`).value = 'No incluida en este BOM';
  }
  r++;

  resumen.getCell(`A${r}`).value = 'Servicio Netmask';
  resumen.getCell(`B${r}`).value = especificacion
    ? `${tipoServicioNombre} (sin valor tarifado — ver Propuesta Técnica / especificación)`
    : 'No incluido en este BOM';
  r += 2;

  resumen.getCell(`A${r}`).value = cotizacion && cotizacion.modo === 'epsp'
    ? 'TOTAL GENERAL COP (no incluye Implementación en días EPSP; ver subtotales de otras monedas arriba)'
    : 'TOTAL GENERAL (COP)';
  resumen.getCell(`B${r}`).value = totalGeneralCop;
  resumen.getCell(`B${r}`).numFmt = '#,##0';
  resumen.getCell(`A${r}`).font = { bold: true };
  resumen.getCell(`B${r}`).font = { bold: true, color: { argb: AZUL_CLARO }, size: 13 };
  r += 2;

  if (bom.notas) {
    resumen.getCell(`A${r}`).value = 'Comentarios';
    estiloEncabezado(resumen.getCell(`A${r}`));
    resumen.mergeCells(r, 1, r, 2);
    r++;
    String(bom.notas).split('\n').forEach((linea) => {
      resumen.getCell(`A${r}`).value = linea;
      resumen.mergeCells(r, 1, r, 2);
      resumen.getRow(r).alignment = { wrapText: true };
      r++;
    });
  }

  if (hardwareItems.length) {
    const hw = wb.addWorksheet('Hardware');
    hw.columns = [
      { header: 'Item', key: 'item', width: 8 },
      { header: 'Referencia', key: 'nombre', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 45 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Costo unitario', key: 'precio', width: 16 },
      { header: 'Moneda', key: 'moneda', width: 10 },
      { header: 'Total', key: 'subtotal', width: 16 },
    ];
    hw.getRow(1).eachCell((cell) => estiloEncabezado(cell));
    hardwareItems.forEach((it, i) => {
      hw.addRow({
        item: i + 1, nombre: it.nombre, descripcion: it.descripcion || '—', cantidad: Number(it.cantidad),
        precio: Number(it.precio_unitario_snapshot), moneda: it.moneda || 'COP', subtotal: Number(it.subtotal),
      });
    });
    hw.getColumn('precio').numFmt = '#,##0.00';
    hw.getColumn('subtotal').numFmt = '#,##0.00';

    let filaTotal = hardwareItems.length + 2;
    Object.entries(totalesPorMoneda).forEach(([moneda, total]) => {
      const totalRow = hw.getRow(filaTotal);
      totalRow.getCell(2).value = `TOTAL ${moneda}`;
      totalRow.getCell(7).value = total;
      totalRow.getCell(7).numFmt = '#,##0.00';
      totalRow.font = { bold: true };
      filaTotal++;
    });
  }

  if (cotizacion) {
    const wsImpl = wb.addWorksheet('Implementación');
    wsImpl.columns = [
      { key: 'texto', width: 55 }, { key: 'cantidad', width: 12 }, { key: 'horas', width: 10 },
      { key: 'totalHoras', width: 14 }, { key: 'modo', width: 12 }, { key: 'costoHora', width: 16 },
    ];
    const tarifa = cotizacion.modo === 'netmask' ? Number(cotizacion.resultado.detalle_calculo.tarifa) : undefined;
    escribirDetalleCotizacion(wsImpl, 1, cotizacion, { tarifa });
  }

  return wb.xlsx.writeBuffer();
}
