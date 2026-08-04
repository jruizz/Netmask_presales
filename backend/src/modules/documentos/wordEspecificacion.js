import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  ImageRun, AlignmentType, HeadingLevel, WidthType, ShadingType, PageNumber, BorderStyle,
} from 'docx';
import { LOGO_BUFFER } from '../../assets/logoNetmask.js';

const NM = { dark: '07182D', light: '0094CE', textDark: '222222', white: 'FFFFFF', grayBg: 'F2F2F2' };
const FONT = 'Calibri';

const ESTADOS_LABEL = {
  borrador: 'Borrador', revision_lider: 'En revisión — Líder Técnico', aprobado_lider: 'Aprobado por Líder Técnico',
  revision_gerencia: 'En revisión — Gerencia', aprobado: 'Aprobado', generado: 'Generado final', rechazado: 'Rechazado',
};

function titulo(texto, num) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text: `${num ? num + '. ' : ''}${texto}`, bold: true, color: NM.dark, font: FONT, size: 28 })],
  });
}
function parrafo(texto) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: texto, font: FONT, size: 22, color: NM.textDark })] });
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
function filaInfo(label, valor) {
  return new TableRow({ children: [celda(label, { width: 35, bg: NM.grayBg, bold: true }), celda(valor, { width: 65 })] });
}

export async function generarWordEspecificacion({ bom, cliente, especificacion, tipoServicio, severidadesCatalogo }) {
  const dw = especificacion.datos_wizard || {};
  const colorPorClave = {};
  severidadesCatalogo.forEach((s) => { colorPorClave[s.clave] = s.color_hex.replace('#', ''); });

  const portada = [
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark },
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 400 },
      children: [new ImageRun({ data: LOGO_BUFFER, transformation: { width: 220, height: 110 } })],
    }),
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark },
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'ESPECIFICACIÓN DE SERVICIO', bold: true, color: NM.white, font: FONT, size: 40 })],
    }),
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark },
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: tipoServicio.nombre, bold: true, color: NM.light, font: FONT, size: 32 })],
    }),
    new Paragraph({
      shading: { type: ShadingType.SOLID, fill: NM.dark },
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
      children: [new TextRun({ text: cliente.razon_social, color: NM.white, font: FONT, size: 26 })],
    }),
    new Paragraph({ pageBreakBefore: true, children: [] }),
  ];

  const control = [
    titulo('Control Documental', 1),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      filaInfo('Cliente', cliente.razon_social),
      filaInfo('Servicio', tipoServicio.nombre),
      filaInfo('Versión', especificacion.version),
      filaInfo('Estado', ESTADOS_LABEL[especificacion.estado] || especificacion.estado),
      filaInfo('Fecha de generación', new Date().toLocaleDateString('es-CO')),
    ] }),
  ];

  const resumenEjecutivo = [
    titulo('Resumen Ejecutivo', 2),
    parrafo(`Este documento describe la especificación del servicio "${tipoServicio.nombre}" para ${cliente.razon_social}, incluyendo alcance, cobertura, niveles de servicio (SLA), matriz de escalamiento y responsabilidades de ambas partes.`),
    parrafo(tipoServicio.descripcion),
  ];

  const objetivo = [
    titulo('Objetivo del Servicio', 3),
    parrafo(tipoServicio.descripcion),
  ];

  const datosGenerales = [
    titulo('Datos Generales del Contrato', 4),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      filaInfo('Modalidad', dw.modalidad),
      filaInfo('Cobertura', dw.cobertura),
      filaInfo('Vigencia', dw.vigencia ? `${dw.vigencia} meses` : '—'),
      filaInfo('Fecha de inicio', dw.fechaInicio || '—'),
      filaInfo('País / Ciudad', `${dw.pais || '—'} / ${dw.ciudad || '—'}`),
      filaInfo('Moneda', dw.moneda),
    ] }),
  ];

  const dimensionamientoFilas = Object.entries(dw.dimensionamiento || {})
    .filter(([, v]) => v !== '' && v !== undefined && v !== null)
    .map(([k, v]) => filaInfo(k, String(v)));

  const alcance = [
    titulo('Alcance Específico del Servicio', 5),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Dimensionamiento', bold: true, font: FONT, size: 22 })] }),
    dimensionamientoFilas.length
      ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: dimensionamientoFilas })
      : parrafo('Sin datos de dimensionamiento registrados.'),
  ];

  const modalidadCobertura = [
    titulo('Modalidad de Prestación y Cobertura Horaria', 6),
    parrafo(`El servicio se presta en modalidad ${dw.modalidad || '—'}, con cobertura ${dw.cobertura || '—'}.`),
  ];

  const slaFilas = (dw.sla || []).map((s) => new TableRow({ children: [
    celda(s.nombreSeveridad, { width: 25, bold: true, color: colorPorClave[s.clave] }),
    celda(s.tiempoRespuesta, { width: 35 }),
    celda(s.tiempoSolucion, { width: 40 }),
  ] }));
  const sla = [
    titulo('SLA y Severidades', 7),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [celda('Severidad', { bg: NM.dark, color: NM.white, bold: true }), celda('Tiempo de Respuesta', { bg: NM.dark, color: NM.white, bold: true }), celda('Tiempo de Solución', { bg: NM.dark, color: NM.white, bold: true })] }),
      ...slaFilas,
    ] }),
  ];

  const escalamientoFilas = (dw.escalamiento || []).map((e) => new TableRow({ children: [
    celda(e.sev), celda(e.ni), celda(e.rnm), celda(e.re), celda(e.te), celda(e.sn), celda(e.canal),
  ] }));
  const escalamientoClienteFilas = (dw.escalamientoCliente || []).map((c) => new TableRow({ children: [
    celda(c.sev), celda(c.nombre), celda(c.cargo), celda(c.correo), celda(c.telefono), celda(c.disponibilidad),
  ] }));
  const escalamiento = [
    titulo('Matriz de Escalamiento', 8),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: 'Escalamiento interno Netmask', bold: true, font: FONT, size: 22 })] }),
    escalamientoFilas.length
      ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: ['Sev', 'Nivel', 'Responsable', 'T. Resp.', 'T. Escal.', 'Siguiente', 'Canal'].map((h) => celda(h, { bg: NM.dark, color: NM.white, bold: true })) }),
          ...escalamientoFilas,
        ] })
      : parrafo('Sin matriz de escalamiento definida.'),
    new Paragraph({ spacing: { before: 200, after: 80 }, children: [new TextRun({ text: 'Contactos de escalamiento del cliente', bold: true, font: FONT, size: 22 })] }),
    escalamientoClienteFilas.length
      ? new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
          new TableRow({ children: ['Sev', 'Nombre', 'Cargo', 'Correo', 'Teléfono', 'Disponibilidad'].map((h) => celda(h, { bg: NM.dark, color: NM.white, bold: true })) }),
          ...escalamientoClienteFilas,
        ] })
      : parrafo('Sin contactos de escalamiento del cliente registrados.'),
  ];

  const canales = [
    titulo('Canales de Comunicación', 9),
    ...(dw.canales || []).map(bullet),
  ];

  const entregables = [
    titulo('Entregables y Frecuencia', 10),
    ...(dw.entregables || []).map(bullet),
  ];

  const supuestos = [titulo('Supuestos', 11), ...(dw.supuestos || []).map(bullet)];
  const exclusiones = [
    titulo('Exclusiones', 12),
    ...(dw.exclusiones || []).map(bullet),
    new Paragraph({ spacing: { before: 150, after: 80 }, children: [new TextRun({ text: `Exclusiones propias del servicio ${tipoServicio.nombre}:`, bold: true, font: FONT, size: 21 })] }),
    ...(tipoServicio.excluye || []).map(bullet),
  ];
  const responsabilidadesNetmask = [titulo('Responsabilidades de Netmask', 13), ...(tipoServicio.incluye || []).map(bullet)];
  const responsabilidadesCliente = [titulo('Responsabilidades del Cliente', 14), ...(tipoServicio.condiciones_cliente || []).map(bullet)];

  const vigencia = [
    titulo('Vigencia Contractual', 15),
    parrafo(`El presente servicio tendrá una vigencia de ${dw.vigencia || '—'} meses, con fecha de inicio ${dw.fechaInicio || 'a definir'}.`),
  ];

  const firma = [
    titulo('Firma y Aprobación', 16),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
      new TableRow({ children: [celda('Por Netmask SAS', { bg: NM.dark, color: NM.white, bold: true, width: 50 }), celda(`Por ${cliente.razon_social}`, { bg: NM.dark, color: NM.white, bold: true, width: 50 })] }),
      new TableRow({ children: [celda('Nombre: _______________________', { width: 50 }), celda('Nombre: _______________________', { width: 50 })] }),
      new TableRow({ children: [celda('Cargo: _______________________', { width: 50 }), celda('Cargo: _______________________', { width: 50 })] }),
      new TableRow({ children: [celda('Firma: _______________________', { width: 50 }), celda('Firma: _______________________', { width: 50 })] }),
      new TableRow({ children: [celda('Fecha: _______________________', { width: 50 }), celda('Fecha: _______________________', { width: 50 })] }),
    ] }),
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      headers: {
        default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${cliente.razon_social} — ${tipoServicio.nombre}`, size: 16, color: '888888', font: FONT })] })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'CONFIDENCIAL — Netmask SAS · ', size: 16, color: '888888', font: FONT }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '888888', font: FONT }),
            new TextRun({ text: ' / ', size: 16, color: '888888', font: FONT }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '888888', font: FONT }),
          ],
        })] }),
      },
      children: [
        ...portada, ...control, ...resumenEjecutivo, ...objetivo, ...datosGenerales, ...alcance,
        ...modalidadCobertura, ...sla, ...escalamiento, ...canales, ...entregables, ...supuestos,
        ...exclusiones, ...responsabilidadesNetmask, ...responsabilidadesCliente, ...vigencia, ...firma,
      ],
    }],
  });

  return Packer.toBuffer(doc);
}
