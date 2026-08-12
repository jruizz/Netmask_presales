import { useState } from 'react';
import Card from './Card.jsx';
import Button from './Button.jsx';
import Badge from './Badge.jsx';
import { ESTADOS_LABEL, ESTADOS_BADGE } from '../constants/estados.js';

// Banner de estado + botones de transicion + historial del flujo de aprobacion
// de 6 pasos, compartido por Implementacion y Servicios Netmask -- antes
// duplicado casi entero entre BomImplementacion.jsx y BomServicios.jsx.
// De paso reemplaza los motivos de rechazo fijos en el texto ("Rechazado por
// lider tecnico"/"...gerencia") por un motivo real capturado del usuario.
export default function AprobacionBanner({ estado, historial, rol, onAccion }) {
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');

  function confirmarRechazo() {
    onAccion('rechazar', motivo.trim() || undefined);
    setRechazando(false);
    setMotivo('');
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <div className="row-between">
        <div className="row">
          <strong>Estado:</strong> <Badge variant={ESTADOS_BADGE[estado] || 'neutral'}>{ESTADOS_LABEL[estado] || estado}</Badge>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {estado === 'borrador' && (rol === 'preventa' || rol === 'superadmin') && (
            <Button size="sm" onClick={() => onAccion('enviar-revision-lider')}>Enviar a revisión (Líder Técnico)</Button>
          )}
          {estado === 'rechazado' && (rol === 'preventa' || rol === 'superadmin') && (
            <Button size="sm" onClick={() => onAccion('enviar-revision-lider')}>Reenviar a revisión</Button>
          )}
          {estado === 'revision_lider' && (rol === 'lider_tecnico' || rol === 'superadmin') && (
            <>
              <Button size="sm" onClick={() => onAccion('aprobar-lider')}>Aprobar (Líder Técnico)</Button>
              <Button size="sm" variant="danger" onClick={() => setRechazando(true)}>Rechazar</Button>
            </>
          )}
          {estado === 'aprobado_lider' && (rol === 'lider_tecnico' || rol === 'superadmin') && (
            <Button size="sm" onClick={() => onAccion('enviar-revision-gerencia')}>Enviar a revisión (Gerencia)</Button>
          )}
          {estado === 'revision_gerencia' && (rol === 'gerencia' || rol === 'superadmin') && (
            <>
              <Button size="sm" onClick={() => onAccion('aprobar-gerencia')}>Aprobar (Gerencia)</Button>
              <Button size="sm" variant="danger" onClick={() => setRechazando(true)}>Rechazar</Button>
            </>
          )}
          {estado === 'aprobado' && (
            <Button size="sm" onClick={() => onAccion('marcar-generado')}>Marcar como generado</Button>
          )}
        </div>
      </div>

      {rechazando && (
        <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          <input
            className="input" style={{ flex: 1, minWidth: 220 }} autoFocus
            placeholder="Motivo del rechazo (queda en el historial)"
            value={motivo} onChange={(e) => setMotivo(e.target.value)}
          />
          <Button size="sm" variant="danger" onClick={confirmarRechazo}>Confirmar rechazo</Button>
          <Button size="sm" variant="outline" onClick={() => { setRechazando(false); setMotivo(''); }}>Cancelar</Button>
        </div>
      )}

      {historial?.length > 0 && (
        <ul className="text-sm muted" style={{ margin: '12px 0 0', paddingLeft: 18 }}>
          {historial.map((h) => (
            <li key={h.id} style={{ marginBottom: 4 }}>
              {new Date(h.fecha).toLocaleString('es-CO')} — {h.estado_anterior || '—'} → {h.estado_nuevo} ({h.usuario_nombre}){h.comentario ? `: ${h.comentario}` : ''}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
