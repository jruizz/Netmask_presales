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
  const [comerciales, setComerciales] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [comercialId, setComercialId] = useState('');
  const [nombre, setNombre] = useState('');
  const [ubicacionProyecto, setUbicacionProyecto] = useState('');
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [nuevoCliente, setNuevoCliente] = useState({ nombreCliente: '', sector: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiFetch('/clientes', { token }).then(setClientes).catch((err) => setError(err.message));
    apiFetch('/comerciales', { token }).then(setComerciales).catch((err) => setError(err.message));
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
      if (!comercialId) throw new Error('Selecciona el comercial asociado');
      const bom = await apiFetch('/boms', {
        method: 'POST',
        token,
        body: { clienteId: Number(finalClienteId), nombre, comercialId: Number(comercialId), ubicacionProyecto },
      });
      navigate(`/boms/${bom.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const comercialesOT = comerciales.filter((c) => c.sector === 'OT');
  const comercialesIT = comerciales.filter((c) => c.sector === 'IT');
  const comercialesMixto = comerciales.filter((c) => c.sector === 'IT/OT');

  return (
    <div className="content" style={{ maxWidth: 560 }}>
      <PageHeader back="/" title="Nuevo BOM" subtitle="Elige o crea el cliente, asigna un comercial y dale un nombre al proyecto." />

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
                <option key={c.id} value={c.id}>{c.nombre_cliente}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="field">
              <label>Nombre del cliente</label>
              <input className="input" value={nuevoCliente.nombreCliente}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombreCliente: e.target.value })} required />
            </div>
            <div className="field">
              <label>Sector</label>
              <input className="input" value={nuevoCliente.sector}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, sector: e.target.value })} placeholder="Ej. Industrial, Financiero, Retail..." />
            </div>
          </>
        )}
        <button type="button" onClick={() => setCreandoCliente(!creandoCliente)}
          style={{ background: 'none', border: 'none', color: 'var(--nm-blue)', cursor: 'pointer', padding: 0, fontSize: 13, marginBottom: 20 }}>
          {creandoCliente ? '← Elegir un cliente existente' : '+ Crear un cliente nuevo'}
        </button>

        <div className="field">
          <label>Comercial asociado</label>
          <select className="input" value={comercialId} onChange={(e) => setComercialId(e.target.value)} required>
            <option value="">-- Selecciona --</option>
            {comercialesOT.length > 0 && (
              <optgroup label="OT">
                {comercialesOT.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </optgroup>
            )}
            {comercialesIT.length > 0 && (
              <optgroup label="IT">
                {comercialesIT.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </optgroup>
            )}
            {comercialesMixto.length > 0 && (
              <optgroup label="IT/OT">
                {comercialesMixto.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </optgroup>
            )}
          </select>
        </div>

        <div className="field">
          <label>Ubicación del proyecto</label>
          <input className="input" value={ubicacionProyecto} onChange={(e) => setUbicacionProyecto(e.target.value)} required
            placeholder="Ej. Planta Rionegro, Sede principal Bogotá..." />
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        <Button type="submit" block disabled={loading}>{loading ? 'Creando...' : 'Crear BOM'}</Button>
      </form>
    </div>
  );
}
