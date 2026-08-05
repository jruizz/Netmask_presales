import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  ImageRun, AlignmentType, HeadingLevel, WidthType, ShadingType, PageNumber,
} from 'docx';
import { LOGO_BUFFER } from '../../assets/logoNetmask.js';

// Formato adaptado del pulido visual de una oferta técnica real (portada de marca,
// encabezado corrido, secciones numeradas), SIN sus tablas de precio — esta
// Propuesta Técnica sigue sin precios ni horas de esfuerzo, por diseño.
const NM = { dark: '07182D', light: '0094CE', textDark: '222222', white: 'FFFFFF', grayBg: 'F2F2F2' };
const FONT = 'Calibri';

let seccionActual = 0;
function tituloSeccion(texto) {
  seccionActual += 1;
  const numero = String(seccionActual).padStart(2, '0');
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    children: [
      new TextRun({ text: `${numero} — `, bold: true, color: NM.light, font: FONT, size: 28 }),
      new TextRun({ text: texto.toUpperCase(), bold: true, color: NM.dark, font: FONT, size: 28 }),
    ],
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

function nombreComponentes({ hardwareItems, cotizacion, especificacion }) {
  const partes = [];
  if (hardwareItems && hardwareItems.length > 0) partes.push('suministro de equipos');
  if (cotizacion) partes.push('implementación técnica');
  if (especificacion) partes.push('un servicio gestionado');
  if (partes.length === 0) return 'alcance por definir';
  if (partes.length === 1) return partes[0];
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

export async function generarWordPropuestaTecnica({ bom, cliente, hardwareItems, cotizacion, especificacion, tipoServicio }) {
  seccionActual = 0;

  const encabezadoCorrido = new Header({
    children: [new Paragraph({
      children: [
        new TextRun({ text: 'Netmask', bold: true, color: NM.dark, font: FONT, size: 18 }),
        new TextRun({ text: `   Propuesta Técnica · ${cliente.nombre_cliente}`, color: '888888', font: FONT, size: 18 }),
      ],
    })],
  });

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
      shading: { type: ShadingType.SOLID, fill: NM.dark }, alignment: AlignmentType.CENTER, spacing: { after: 400 },
      children: [new TextRun({ text: cliente.nombre_cliente, color: NM.white, font: FONT, size: 26 })],
    }),
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark }, alignment: AlignmentType.CENTER, spacing: { after: 800 },
      children: [new TextRun({ text: 'Documento confidencial — uso exclusivo del destinatario', italics: true, color: '9FB4C4', font: FONT, size: 18 })],
    }),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  ];

  const resumenEjecutivo = [
    tituloSeccion('Resumen Ejecutivo'),
    parrafo(`Netmask presenta a ${cliente.nombre_cliente} el alcance de ${nombreComponentes({ hardwareItems, cotizacion, especificacion })} para el proyecto "${bom.nombre}". Este documento describe qué se entrega y bajo qué condiciones técnicas — no contiene información de precios ni de horas de esfuerzo; el valor comercial se gestiona por separado en la cotización correspondiente.`),
  ];

  const alcanceGeneral = [
    tituloSeccion('Alcance General'),
    parrafo('Esta propuesta combina los siguientes componentes:'),
    ...(hardwareItems && hardwareItems.length > 0 ? [bullet('Equipos y licenciamiento contemplados (sección "Equipos Contemplados").')] : []),
    ...(cotizacion ? [bullet('Implementación técnica de las tecnologías descritas en "Alcance de Implementación".')] : []),
    ...(especificacion ? [bullet(`Servicio gestionado "${tipoServicio?.nombre || ''}", descrito en "Alcance de Servicio Gestionado".`)] : []),
  ];

  const seccionesComponentes = [];

  if (hardwareItems && hardwareItems.length > 0) {
    seccionesComponentes.push(
      tituloSeccion('Equipos Contemplados'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            celda('Referencia', { bg: NM.dark, color: NM.white, bold: true, width: 35 }),
            celda('Descripción', { bg: NM.dark, color: NM.white, bold: true, width: 45 }),
            celda('Cantidad', { bg: NM.dark, color: NM.white, bold: true, width: 20 }),
          ] }),
          ...hardwareItems.map((it) => new TableRow({ children: [celda(it.nombre), celda(it.descripcion || '—'), celda(String(it.cantidad))] })),
        ],
      }),
    );
  }

  if (cotizacion) {
    const detalle = cotizacion.resultado.detalle_calculo;
    seccionesComponentes.push(tituloSeccion('Alcance de Implementación'));
    detalle.blocks.forEach((block) => {
      seccionesComponentes.push(subtitulo(block.titulo));
      block.items.forEach((it) => seccionesComponentes.push(bullet(`${it.texto} (${it.modo === 'en_sitio' ? 'en sitio' : 'remota'})`)));
    });
  }

  if (especificacion && tipoServicio) {
    const dw = especificacion.datos_wizard || {};
    seccionesComponentes.push(
      tituloSeccion('Alcance de Servicio Gestionado'),
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
    seccionesComponentes.push(tituloSeccion('Alcance'), parrafo('Este BOM aún no tiene componentes configurados (Hardware, Implementación o Servicios Netmask).'));
  }

  const condicionesGenerales = [
    tituloSeccion('Condiciones Generales'),
    bullet('Esta propuesta describe alcance técnico únicamente — no incluye precios, tarifas ni horas de esfuerzo; el valor comercial se gestiona en la cotización correspondiente, entregada por separado.'),
    bullet('El alcance definitivo queda sujeto a confirmación en el levantamiento técnico previo al inicio del proyecto.'),
    bullet('Esta propuesta tiene una vigencia de 30 días calendario a partir de su fecha de emisión, salvo que se indique lo contrario.'),
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      headers: { default: encabezadoCorrido },
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
      children: [...portada, ...resumenEjecutivo, ...alcanceGeneral, ...seccionesComponentes, ...condicionesGenerales],
    }],
  });

  return Packer.toBuffer(doc);
}
