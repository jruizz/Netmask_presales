import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';

export default function BomNuevo() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [nombre, setNombre] = useState('');
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ razonSocial: '', ciudad: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/clientes', { token }).then(setClientes).catch((err) => setError(err.message));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let finalClienteId = clienteId;
      if (creandoCliente) {
        const cliente = await apiFetch('/clientes', { method: 'POST', token, body: nuevoCliente });
        finalClienteId = cliente.id;
      }
      if (!finalClienteId) throw new Error('Selecciona o crea un cliente');
      const bom = await apiFetch('/boms', {
        method: 'POST',
        token,
        body: { clienteId: Number(finalClienteId), nombre },
      });
      navigate(`/boms/${bom.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content" style={{ maxWidth: 560 }}>
      <PageHeader back="/" title="Nuevo BOM" subtitle="Elige o crea el cliente y dale un nombre al proyecto." />

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>Nombre del proyecto</label>
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
        </div>

        {!creandoCliente ? (
          <div className="field">
            <label>Cliente</label>
            <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">-- Selecciona un cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.razon_social}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Razón social del nuevo cliente</label>
              <input className="input" value={nuevoCliente.razonSocial}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, razonSocial: e.target.value })} required />
            </div>
            <div className="field">
              <label>Ciudad</label>
              <input className="input" value={nuevoCliente.ciudad}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, ciudad: e.target.value })} />
            </div>
          </>
        )}
        <button type="button" onClick={() => setCreandoCliente(!creandoCliente)}
          style={{ background: 'none', border: 'none', color: 'var(--nm-blue)', cursor: 'pointer', padding: 0, fontSize: 13, marginBottom: 20 }}>
          {creandoCliente ? '← Elegir un cliente existente' : '+ Crear un cliente nuevo'}
        </button>

        {error && <div className="alert alert-danger">{error}</div>}
        <Button type="submit" block disabled={loading}>{loading ? 'Creando...' : 'Crear BOM'}</Button>
      </form>
    </div>
  );
}
