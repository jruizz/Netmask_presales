import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { IconPlus, IconBox } from '../components/icons.jsx';

const ROLES_VISIBILIDAD_AMPLIADA = ['superadmin', 'gerencia'];
const ESTADO_BADGE = { borrador: 'neutral', activo: 'info', cerrado: 'success' };

export default function Dashboard() {
  const { me, token } = useAuth();
  const [boms, setBoms] = useState([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const puedeVerTodos = me && ROLES_VISIBILIDAD_AMPLIADA.includes(me.rol);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/boms${mineOnly ? '?mine=true' : ''}`, { token })
      .then(setBoms)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, mineOnly]);

  return (
    <div className="content">
      <PageHeader
        title={puedeVerTodos && !mineOnly ? 'Todos los BOMs' : 'Mis BOMs'}
        subtitle="Proyectos de preventa: hardware, implementación y servicios Netmask."
        actions={
          <>
            {puedeVerTodos && (
              <label className="checkbox-row" style={{ marginRight: 4 }}>
                <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> Solo los míos
              </label>
            )}
            <Link to="/boms/nuevo">
              <Button><IconPlus width={16} height={16} /> Nuevo BOM</Button>
            </Link>
          </>
        }
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="spinner-wrap">Cargando...</div>
        ) : boms.length === 0 ? (
          <EmptyState icon={IconBox} title="No hay BOMs todavía" description='Crea el primero con el botón "Nuevo BOM".' />
        ) : (
          <div className="table-wrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Cliente</th>
                  <th>Comercial</th>
                  <th>Estado</th>
                  <th>Creado por</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {boms.map((b) => (
                  <tr key={b.id}>
                    <td><Link to={`/boms/${b.id}`} style={{ fontWeight: 600 }}>{b.nombre}</Link></td>
                    <td>{b.cliente_nombre}</td>
                    <td className="muted">{b.comercial_nombre || '—'}</td>
                    <td><Badge variant={ESTADO_BADGE[b.estado] || 'neutral'}>{b.estado}</Badge></td>
                    <td className="muted">{b.creador_nombre}</td>
                    <td className="muted">{new Date(b.creado_en).toLocaleDateString('es-CO')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
