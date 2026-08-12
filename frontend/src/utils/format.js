// Formateador de moneda compartido -- antes redefinido de forma independiente
// en BomHardware.jsx, BomImplementacion.jsx, BomResumen.jsx y
// CatalogoHardware.jsx (esta ultima con 2 decimales en vez de 0, unica
// diferencia real entre las copias). `decimals` deja ese comportamiento
// explicito por sitio de uso en vez de forzarlos a coincidir.
export function formatMoney(n, decimals = 0) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('es-CO', { maximumFractionDigits: decimals });
}
