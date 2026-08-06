import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import { IconTrash } from '../components/icons.jsx';

const BADGE_POR_SECTOR = { OT: 'info', IT: 'success', 'IT/OT': 'warning' };

export default function Comerciales() {
  const { token } = useAuth();
  const [comerciales, setComerciales] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [edicion, setEdicion] = useState({ nombre: '', sector: 'OT' });
  const [nuevo, setNuevo] = useState({ nombre: '', sector: 'OT' });
  const [error, setError] = useState('');

  function cargar() {
    apiFetch('/comerciales', { token }).then(setComerciales).catch((err) => setError(err.message));
  }
  useEffect(cargar, [token]);

  function empezarEdicion(c) {
    setEditandoId(c.id);
    setEdicion({ nombre: c.nombre, sector: c.sector });
  }

  async function guardarEdicion() {
    setError('');
    try {
      await apiFetch(`/comerciales/${editandoId}`, { method: 'PUT', token, body: edicion });
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function desactivar(id) {
    setError('');
    try {
      await apiFetch(`/comerciales/${id}`, { method: 'DELETE', token });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function crear(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/comerciales', { method: 'POST', token, body: nuevo });
      setNuevo({ nombre: '', sector: 'OT' });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="content">
      <PageHeader title="Comerciales" subtitle="Roster de comerciales OT/IT asociados a los BOMs." />
      {error && <div className="alert alert-danger">{error}</div>}

      <Card title="Roster" style={{ marginBottom: 20 }}>
        <div className="table-wrap" style={{ marginBottom: 20 }}>
          <table className="nm-table">
            <thead><tr><th>Nombre</th><th>Sector</th><th></th></tr></thead>
            <tbody>
              {comerciales.map((c) => (
                <tr key={c.id}>
                  {editandoId === c.id ? (
                    <>
                      <td><input className="input" value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} /></td>
                      <td>
                        <select className="input" value={edicion.sector} onChange={(e) => setEdicion({ ...edicion, sector: e.target.value })}>
                          <option value="OT">OT</option>
                          <option value="IT">IT</option>
                          <option value="IT/OT">IT/OT</option>
                        </select>
                      </td>
                      <td className="row">
                        <Button size="sm" onClick={guardarEdicion}>Guardar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditandoId(null)}>Cancelar</Button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                      <td><Badge variant={BADGE_POR_SECTOR[c.sector] || 'neutral'}>{c.sector}</Badge></td>
                      <td className="row">
                        <Button size="sm" variant="outline" onClick={() => empezarEdicion(c)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => desactivar(c.id)} style={{ color: 'var(--nm-danger)' }}>
                          <IconTrash width={14} height={14} />
                        </Button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--nm-text-muted)', marginBottom: 12 }}>
          Agregar comercial
        </h4>
        <form onSubmit={crear} className="row" style={{ alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label>Nombre</label>
            <input className="input" required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Sector</label>
            <select className="input" value={nuevo.sector} onChange={(e) => setNuevo({ ...nuevo, sector: e.target.value })}>
              <option value="OT">OT</option>
              <option value="IT">IT</option>
              <option value="IT/OT">IT/OT</option>
            </select>
          </div>
          <Button type="submit">Agregar</Button>
        </form>
      </Card>
    </div>
  );
}
