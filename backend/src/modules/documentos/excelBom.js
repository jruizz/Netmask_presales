import ExcelJS from 'exceljs';
import { estiloEncabezado, escribirDetalleCotizacion } from './excelCotizacion.js';

const AZUL_CLARO = 'FF0094CE';

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
  resumen.getCell('A3').value = 'Fecha';
  resumen.getCell('B3').value = new Date().toLocaleDateString('es-CO');

  let r = 5;
  const totalHardware = hardwareItems.reduce((acc, it) => acc + Number(it.subtotal), 0);
  resumen.getCell(`A${r}`).value = 'Hardware (subtotal)';
  resumen.getCell(`B${r}`).value = hardwareItems.length ? totalHardware : 'No incluido en este BOM';
  if (hardwareItems.length) resumen.getCell(`B${r}`).numFmt = '#,##0';
  r++;

  let totalGeneralCop = hardwareItems.length ? totalHardware : 0;
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
    ? 'TOTAL GENERAL (COP, no incluye Implementación en días EPSP)'
    : 'TOTAL GENERAL (COP)';
  resumen.getCell(`B${r}`).value = totalGeneralCop;
  resumen.getCell(`B${r}`).numFmt = '#,##0';
  resumen.getCell(`A${r}`).font = { bold: true };
  resumen.getCell(`B${r}`).font = { bold: true, color: { argb: AZUL_CLARO }, size: 13 };

  if (hardwareItems.length) {
    const hw = wb.addWorksheet('Hardware');
    hw.columns = [
      { header: 'Nombre', key: 'nombre', width: 35 },
      { header: 'SKU', key: 'sku', width: 18 },
      { header: 'Cantidad', key: 'cantidad', width: 12 },
      { header: 'Precio unitario', key: 'precio', width: 16 },
      { header: 'Subtotal', key: 'subtotal', width: 16 },
    ];
    hw.getRow(1).eachCell((cell) => estiloEncabezado(cell));
    hardwareItems.forEach((it) => {
      hw.addRow({
        nombre: it.nombre, sku: it.sku || '—', cantidad: Number(it.cantidad),
        precio: Number(it.precio_unitario_snapshot), subtotal: Number(it.subtotal),
      });
    });
    hw.getColumn('precio').numFmt = '#,##0';
    hw.getColumn('subtotal').numFmt = '#,##0';
    const totalRow = hw.addRow({ nombre: 'TOTAL', subtotal: totalHardware });
    totalRow.font = { bold: true };
    hw.getCell(`E${totalRow.number}`).numFmt = '#,##0';
  }

  if (cotizacion) {
    const wsImpl = wb.addWorksheet('Implementación');
    wsImpl.columns = [
      { key: 'texto', width: 55 }, { key: 'cantidad', width: 12 }, { key: 'horas', width: 10 },
      { key: 'totalHoras', width: 14 }, { key: 'modo', width: 12 },
    ];
    escribirDetalleCotizacion(wsImpl, 1, cotizacion);
  }

  return wb.xlsx.writeBuffer();
}
