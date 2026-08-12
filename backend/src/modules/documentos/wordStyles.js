import { Paragraph, TextRun, TableCell, TableRow, WidthType, ShadingType, HeadingLevel } from 'docx';

// Paleta y helpers de estilo compartidos por los generadores de Word
// (Especificacion de Servicio y Propuesta Tecnica) -- antes duplicados
// character por character en cada archivo.
export const NM = { dark: '07182D', light: '0094CE', textDark: '222222', white: 'FFFFFF', grayBg: 'F2F2F2' };
export const FONT = 'Calibri';

// Titulo simple numerado ("N. Texto"), usado por la Especificacion de Servicio.
export function titulo(texto, num) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: `${num ? num + '. ' : ''}${texto}`, bold: true, color: NM.dark, font: FONT, size: 28 })],
  });
}

// Titulo numerado autoincremental ("01 — TEXTO"), usado por la Propuesta
// Tecnica. Cada llamada a generarWordPropuestaTecnica debe crear su propio
// contador (no un modulo-level counter compartido) para no mezclar la
// numeracion entre documentos generados en paralelo.
export function crearContadorSecciones() {
  let seccionActual = 0;
  return function tituloSeccion(texto) {
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
  };
}

export function parrafo(texto) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: texto, font: FONT, size: 22, color: NM.textDark })] });
}

export function subtitulo(texto) {
  return new Paragraph({ spacing: { before: 150, after: 80 }, children: [new TextRun({ text: texto, bold: true, font: FONT, size: 23, color: NM.light })] });
}

export function bullet(texto) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: texto, font: FONT, size: 21, color: NM.textDark })] });
}

export function celda(texto, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.bg ? { type: ShadingType.SOLID, fill: opts.bg } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: String(texto ?? '—'), font: FONT, size: 20, bold: !!opts.bold, color: opts.color || NM.textDark })] })],
  });
}

export function filaInfo(label, valor) {
  return new TableRow({ children: [celda(label, { width: 35, bg: NM.grayBg, bold: true }), celda(valor, { width: 65 })] });
}
