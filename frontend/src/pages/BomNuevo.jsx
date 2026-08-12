import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import ComercialSelect from '../components/ComercialSelect.jsx';
import Field from '../components/Field.jsx';

export default function BomNuevo() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [comerciales, setComerciales] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [comercialId, setComercialId] = useState('');
  const [nombre, setNombre] = useState('');
  const [ubicacionProyecto, setUbicacionProyecto] = useState('');
  const [idOportunidad, setIdOportunidad] = useState('');
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
      const idOportunidadTrim = idOportunidad.trim();
      if (idOportunidadTrim && !/^OP-\d+$/.test(idOportunidadTrim)) {
        throw new Error('El ID de oportunidad debe tener el formato OP-#### (ej. OP-5309)');
      }
      const bom = await apiFetch('/boms', {
        method: 'POST',
        token,
        body: {
          clienteId: Number(finalClienteId),
          nombre,
          comercialId: Number(comercialId),
          ubicacionProyecto,
          ...(idOportunidadTrim ? { idOportunidad: idOportunidadTrim } : {}),
        },
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
      <PageHeader back="/" title="Nuevo BOM" subtitle="Elige o crea el cliente, asigna un comercial y dale un nombre al proyecto." />

      <form onSubmit={handleSubmit} className="card">
        <Field label="Nombre del proyecto">
          <input className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
        </Field>

        {!creandoCliente ? (
          <Field label="Cliente">
            <select className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">-- Selecciona un cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre_cliente}</option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Nombre del cliente">
              <input className="input" value={nuevoCliente.nombreCliente}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, nombreCliente: e.target.value })} required />
            </Field>
            <Field label="Sector">
              <input className="input" value={nuevoCliente.sector}
                onChange={(e) => setNuevoCliente({ ...nuevoCliente, sector: e.target.value })} placeholder="Ej. Industrial, Financiero, Retail..." />
            </Field>
          </>
        )}
        <button type="button" onClick={() => setCreandoCliente(!creandoCliente)}
          style={{ background: 'none', border: 'none', color: 'var(--nm-blue)', cursor: 'pointer', padding: 0, fontSize: 13, marginBottom: 20 }}>
          {creandoCliente ? '← Elegir un cliente existente' : '+ Crear un cliente nuevo'}
        </button>

        <Field label="Comercial asociado">
          <ComercialSelect comerciales={comerciales} value={comercialId} onChange={(e) => setComercialId(e.target.value)} required />
        </Field>

        <Field label="Ubicación del proyecto">
          <input className="input" value={ubicacionProyecto} onChange={(e) => setUbicacionProyecto(e.target.value)} required
            placeholder="Ej. Planta Rionegro, Sede principal Bogotá..." />
        </Field>

        <Field label={<>ID de la oportunidad <span className="muted">(opcional)</span></>}>
          <input className="input" value={idOportunidad} onChange={(e) => setIdOportunidad(e.target.value)}
            placeholder="Ej. OP-5309" />
        </Field>

        {error && <div className="alert alert-danger">{error}</div>}
        <Button type="submit" block disabled={loading}>{loading ? 'Creando...' : 'Crear BOM'}</Button>
      </form>
    </div>
  );
}
