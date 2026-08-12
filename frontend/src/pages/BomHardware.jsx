import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { IconBox, IconTrash, IconPlus } from '../components/icons.jsx';
import { formatMoney as money } from '../utils/format.js';
import Field from '../components/Field.jsx';

export default function BomHardware() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState([]);
  const [creandoNuevo, setCreandoNuevo] = useState(false);
  const [nuevoItem, setNuevoItem] = useState({ nombre: '', marca: '', sku: '', numeroParte: '', descripcion: '', precio: '', moneda: 'COP' });
  const [error, setError] = useState('');

  function cargarItems() {
    apiFetch(`/boms/${id}/hardware-items`, { token }).then(setItems).catch((err) => setError(err.message));
  }

  useEffect(cargarItems, [id, token]);

  useEffect(() => {
    if (!q) { setResultados([]); return; }
    const handle = setTimeout(() => {
      apiFetch(`/catalogo-hardware?q=${encodeURIComponent(q)}`, { token }).then(setResultados).catch((err) => setError(err.message));
    }, 300);
    return () => clearTimeout(handle);
  }, [q, token]);

  async function agregarExistente(hardwareId) {
    setError('');
    try {
      await apiFetch(`/boms/${id}/hardware-items`, { method: 'POST', token, body: { hardwareId, cantidad: 1 } });
      setQ('');
      setResultados([]);
      cargarItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function crearYAgregar(e) {
    e.preventDefault();
    setError('');
    try {
      const creado = await apiFetch('/catalogo-hardware', {
        method: 'POST',
        token,
        body: { ...nuevoItem, precio: Number(nuevoItem.precio) || 0 },
      });
      await apiFetch(`/boms/${id}/hardware-items`, { method: 'POST', token, body: { hardwareId: creado.id, cantidad: 1 } });
      setNuevoItem({ nombre: '', marca: '', sku: '', numeroParte: '', descripcion: '', precio: '', moneda: 'COP' });
      setCreandoNuevo(false);
      cargarItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function actualizarCantidad(itemId, cantidad) {
    cantidad = Math.round(cantidad);
    if (cantidad <= 0) return;
    try {
      await apiFetch(`/boms/${id}/hardware-items/${itemId}`, { method: 'PUT', token, body: { cantidad } });
      cargarItems();
    } catch (err) {
      setError(err.message);
    }
  }

  async function quitarItem(itemId) {
    try {
      await apiFetch(`/boms/${id}/hardware-items/${itemId}`, { method: 'DELETE', token });
      cargarItems();
    } catch (err) {
      setError(err.message);
    }
  }

  // Los totales se agrupan por moneda -- nunca se suma COP con USD como si fueran lo mismo.
  const totalesPorMoneda = items.reduce((acc, it) => {
    const m = it.moneda || 'COP';
    acc[m] = (acc[m] || 0) + Number(it.subtotal);
    return acc;
  }, {});

  return (
    <div className="content">
      <PageHeader back={`/boms/${id}`} title="Hardware" subtitle="Busca en el catálogo compartido o crea un ítem nuevo si no existe." />
      {error && <div className="alert alert-danger">{error}</div>}

      <Card className="stack" style={{ marginBottom: 20 }}>
        <Field label="Buscar en el catálogo (nombre, SKU o número de parte)" style={{ marginBottom: resultados.length ? 10 : 0 }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej. FortiGate 60F" />
        </Field>
        {resultados.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 10px' }}>
            {resultados.map((r) => (
              <li key={r.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--nm-border)' }}>
                <span className="text-sm">{r.marca && <strong>{r.marca} </strong>}{r.nombre} {r.sku && <em className="muted">({r.sku})</em>} — ${money(r.precio)} {r.moneda}</span>
                <Button size="sm" variant="outline" onClick={() => agregarExistente(r.id)}><IconPlus width={14} height={14} /> Agregar</Button>
              </li>
            ))}
          </ul>
        )}

        <button type="button" onClick={() => setCreandoNuevo(!creandoNuevo)}
          style={{ background: 'none', border: 'none', color: 'var(--nm-blue)', cursor: 'pointer', padding: 0, fontSize: 13 }}>
          {creandoNuevo ? '← Cancelar' : '+ Crear ítem nuevo en el catálogo'}
        </button>

        {creandoNuevo && (
          <form onSubmit={crearYAgregar} style={{ marginTop: 14 }}>
            <div className="form-grid">
              <Field label="Nombre">
                <input className="input" required value={nuevoItem.nombre} onChange={(e) => setNuevoItem({ ...nuevoItem, nombre: e.target.value })} />
              </Field>
              <Field label="Marca">
                <input className="input" value={nuevoItem.marca} onChange={(e) => setNuevoItem({ ...nuevoItem, marca: e.target.value })} placeholder="Ej. Fortinet, Cisco..." />
              </Field>
              <Field label="SKU / número de parte">
                <input className="input" value={nuevoItem.sku} onChange={(e) => setNuevoItem({ ...nuevoItem, sku: e.target.value })} />
              </Field>
              <Field label="Descripción" style={{ gridColumn: '1 / -1' }}>
                <input className="input" value={nuevoItem.descripcion} onChange={(e) => setNuevoItem({ ...nuevoItem, descripcion: e.target.value })} />
              </Field>
              <Field label="Precio">
                <input className="input" type="number" min="0" step="0.01" required value={nuevoItem.precio} onChange={(e) => setNuevoItem({ ...nuevoItem, precio: e.target.value })} />
              </Field>
              <Field label="Moneda">
                <select className="input" value={nuevoItem.moneda} onChange={(e) => setNuevoItem({ ...nuevoItem, moneda: e.target.value })}>
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                </select>
              </Field>
            </div>
            <Button type="submit">Crear y agregar al BOM</Button>
          </form>
        )}
      </Card>

      <Card title="Ítems del BOM">
        {items.length === 0 ? (
          <EmptyState icon={IconBox} description="No hay hardware agregado todavía." />
        ) : (
          <div className="table-wrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Marca</th><th>SKU</th><th>Cantidad</th><th>Precio unitario</th><th>Subtotal</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.nombre}</td>
                    <td className="muted">{it.marca || '—'}</td>
                    <td className="muted">{it.sku || '—'}</td>
                    <td>
                      <input className="input" type="number" min="1" step="1" value={it.cantidad}
                        onChange={(e) => actualizarCantidad(it.id, Number(e.target.value))} style={{ width: 80 }} />
                    </td>
                    <td>${money(it.precio_unitario_snapshot)} {it.moneda || 'COP'}</td>
                    <td style={{ fontWeight: 600 }}>${money(it.subtotal)} {it.moneda || 'COP'}</td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => quitarItem(it.id)} style={{ color: 'var(--nm-danger)' }}>
                        <IconTrash width={15} height={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {Object.entries(totalesPorMoneda).map(([moneda, total]) => (
                  <tr key={moneda}>
                    <td colSpan={5} style={{ textAlign: 'right' }}>Total {moneda}</td>
                    <td style={{ color: 'var(--nm-blue-dark)' }}>${money(total)} {moneda}</td>
                    <td></td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <Button onClick={() => navigate(`/boms/${id}`)} style={{ marginTop: 20 }}>Aplicar</Button>
    </div>
  );
}
