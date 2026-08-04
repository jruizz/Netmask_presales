import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { IconAudit } from '../components/icons.jsx';

export default function Auditoria() {
  const { token } = useAuth();
  const [entradas, setEntradas] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/auditoria?limit=200', { token })
      .then(setEntradas)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="content content-wide">
      <PageHeader title="Auditoría" subtitle="Creación, edición, eliminación y transiciones de estado — incluye intentos denegados." />
      {error && <div className="alert alert-danger">{error}</div>}

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div className="spinner-wrap">Cargando...</div>
        ) : entradas.length === 0 ? (
          <EmptyState icon={IconAudit} description="No hay entradas de auditoría todavía." />
        ) : (
          <div className="table-wrap">
            <table className="nm-table">
              <thead>
                <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {entradas.map((e) => (
                  <tr key={e.id}>
                    <td className="muted">{new Date(e.fecha).toLocaleString('es-CO')}</td>
                    <td>{e.usuario_nombre || <span className="muted">Login fallido / sin usuario</span>}</td>
                    <td>{e.accion}</td>
                    <td className="muted">{e.entidad_tipo}{e.entidad_id ? ` #${e.entidad_id}` : ''}</td>
                    <td><Badge variant={e.detalle?.status >= 400 ? 'danger' : 'success'}>{e.detalle?.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
