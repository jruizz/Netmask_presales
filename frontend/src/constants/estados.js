// Estados del flujo de aprobacion de 6 pasos (Implementacion y Servicios
// comparten la misma maquina de estados en el backend -- ver
// shared/aprobacionWorkflow.js). Antes duplicado en BomImplementacion.jsx,
// BomServicios.jsx y BomResumen.jsx, con el texto ya divergido entre copias.
export const ESTADOS_LABEL = {
  borrador: 'Borrador',
  revision_lider: 'En revisión — Líder Técnico',
  aprobado_lider: 'Aprobado por Líder Técnico',
  revision_gerencia: 'En revisión — Gerencia',
  aprobado: 'Aprobado',
  generado: 'Generado final',
  rechazado: 'Rechazado',
};

export const ESTADOS_BADGE = {
  borrador: 'neutral',
  revision_lider: 'warning',
  aprobado_lider: 'info',
  revision_gerencia: 'warning',
  aprobado: 'success',
  generado: 'success',
  rechazado: 'danger',
};
