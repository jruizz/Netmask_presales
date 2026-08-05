import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Footer,
  ImageRun, AlignmentType, HeadingLevel, WidthType, ShadingType, PageNumber,
} from 'docx';
import { LOGO_BUFFER } from '../../assets/logoNetmask.js';

const NM = { dark: '07182D', light: '0094CE', textDark: '222222', white: 'FFFFFF', grayBg: 'F2F2F2' };
const FONT = 'Calibri';

function titulo(texto) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: texto, bold: true, color: NM.dark, font: FONT, size: 28 })],
  });
}
function parrafo(texto) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: texto, font: FONT, size: 22, color: NM.textDark })] });
}
function subtitulo(texto) {
  return new Paragraph({ spacing: { before: 150, after: 80 }, children: [new TextRun({ text: texto, bold: true, font: FONT, size: 23, color: NM.light })] });
}
function bullet(texto) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: texto, font: FONT, size: 21, color: NM.textDark })] });
}
function celda(texto, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.bg ? { type: ShadingType.SOLID, fill: opts.bg } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: String(texto ?? '—'), font: FONT, size: 20, bold: !!opts.bold, color: opts.color || NM.textDark })] })],
  });
}

export async function generarWordPropuestaTecnica({ bom, cliente, hardwareItems, cotizacion, especificacion, tipoServicio }) {
  const portada = [
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark }, alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 400 },
      children: [new ImageRun({ data: LOGO_BUFFER, transformation: { width: 220, height: 110 } })],
    }),
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark }, alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: 'PROPUESTA TÉCNICA', bold: true, color: NM.white, font: FONT, size: 40 })],
    }),
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark }, alignment: AlignmentType.CENTER, spacing: { after: 100 },
      children: [new TextRun({ text: bom.nombre, bold: true, color: NM.light, font: FONT, size: 32 })],
    }),
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark }, alignment: AlignmentType.CENTER, spacing: { after: 800 },
      children: [new TextRun({ text: cliente.nombre_cliente, color: NM.white, font: FONT, size: 26 })],
    }),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  ];

  const introduccion = [
    titulo('Introducción'),
    parrafo(`Esta propuesta técnica resume el alcance del proyecto "${bom.nombre}" para ${cliente.nombre_cliente}. Describe qué se implementa y/o qué servicio gestionado de Netmask aplica, junto con lo que incluye y lo que no. Este documento no contiene información de precios ni de horas de esfuerzo; el valor comercial se gestiona por separado.`),
  ];

  const seccionesComponentes = [];

  if (hardwareItems && hardwareItems.length > 0) {
    seccionesComponentes.push(
      titulo('Hardware Contemplado'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [celda('Ítem', { bg: NM.dark, color: NM.white, bold: true, width: 70 }), celda('Cantidad', { bg: NM.dark, color: NM.white, bold: true, width: 30 })] }),
          ...hardwareItems.map((it) => new TableRow({ children: [celda(it.nombre), celda(String(it.cantidad))] })),
        ],
      }),
    );
  }

  if (cotizacion) {
    const detalle = cotizacion.resultado.detalle_calculo;
    seccionesComponentes.push(titulo('Alcance de Implementación'));
    detalle.blocks.forEach((block) => {
      seccionesComponentes.push(subtitulo(block.titulo));
      block.items.forEach((it) => seccionesComponentes.push(bullet(`${it.texto} (${it.modo === 'en_sitio' ? 'en sitio' : 'remota'})`)));
    });
  }

  if (especificacion && tipoServicio) {
    const dw = especificacion.datos_wizard || {};
    seccionesComponentes.push(
      titulo('Alcance de Servicio Netmask'),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: tipoServicio.nombre, bold: true, font: FONT, size: 24, color: NM.dark })] }),
      parrafo(tipoServicio.descripcion),
      parrafo(`Modalidad: ${dw.modalidad || '—'} · Cobertura: ${dw.cobertura || '—'}`),
      subtitulo('Incluye'),
      ...(tipoServicio.incluye || []).map(bullet),
      subtitulo('No incluye'),
      ...(tipoServicio.excluye || []).map(bullet),
    );
    if ((dw.sla || []).length) {
      seccionesComponentes.push(
        subtitulo('Niveles de Servicio (SLA)'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [celda('Severidad', { bg: NM.dark, color: NM.white, bold: true }), celda('T. Respuesta', { bg: NM.dark, color: NM.white, bold: true }), celda('T. Solución', { bg: NM.dark, color: NM.white, bold: true })] }),
            ...dw.sla.map((s) => new TableRow({ children: [celda(s.nombreSeveridad), celda(s.tiempoRespuesta), celda(s.tiempoSolucion)] })),
          ],
        }),
      );
    }
  }

  if (seccionesComponentes.length === 0) {
    seccionesComponentes.push(titulo('Alcance'), parrafo('Este BOM aún no tiene componentes configurados (Hardware, Implementación o Servicios Netmask).'));
  }

  const doc = new Document({
    sections: [{
      properties: {},
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Netmask SAS · Propuesta Técnica · ', size: 16, color: '888888', font: FONT }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888', font: FONT }),
            new TextRun({ text: ' / ', size: 16, color: '888888', font: FONT }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '888888', font: FONT }),
          ],
        })] }),
      },
      children: [...portada, ...introduccion, ...seccionesComponentes],
    }],
  });

  return Packer.toBuffer(doc);
}
