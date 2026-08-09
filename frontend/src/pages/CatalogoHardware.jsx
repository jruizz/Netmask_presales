import { Fragment, useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { IconBox, IconTrash, IconPlus } from '../components/icons.jsx';

const money = (n) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 2 });

function formularioVacio() {
  return { nombre: '', marca: '', sku: '', numeroParte: '', descripcion: '', precio: '', moneda: 'COP', tecnologiaImplSugeridaId: '' };
}

// Componente de nivel superior (no anidado dentro de CatalogoHardware): si se
// define adentro, React lo trata como un tipo de componente nuevo en cada
// render y remonta los inputs, perdiendo el foco despues de cada tecla.
function FormularioItem({ form, setForm, tecnologias, guardar, cancelar, guardando }) {
  return (
    <Card style={{ marginBottom: 20 }}>
      <div className="form-grid" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Nombre</label>
          <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. FortiGate 60F" />
        </div>
        <div className="field">
          <label>Marca</label>
          <input className="input" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} placeholder="Ej. Fortinet, Cisco..." />
        </div>
        <div className="field">
          <label>SKU</label>
          <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="field">
          <label>Número de parte</label>
          <input className="input" value={form.numeroParte} onChange={(e) => setForm({ ...form, numeroParte: e.target.value })} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Descripción</label>
          <input className="input" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <div className="field">
          <label>Precio</label>
          <input className="input" type="number" min="0" step="0.01" required value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} />
        </div>
        <div className="field">
          <label>Moneda</label>
          <select className="input" value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value })}>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="field">
          <label>Tecnología de Implementación sugerida</label>
          <select className="input" value={form.tecnologiaImplSugeridaId} onChange={(e) => setForm({ ...form, tecnologiaImplSugeridaId: e.target.value })}>
            <option value="">— Ninguna —</option>
            {tecnologias.map((t) => <option key={t.id} value={t.id}>{t.grupo_nombre} · {t.nombre}</option>)}
          </select>
        </div>
      </div>
      <div className="row">
        <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
        <Button variant="outline" onClick={cancelar}>Cancelar</Button>
      </div>
    </Card>
  );
}

export default function CatalogoHardware() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [tecnologias, setTecnologias] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [editandoId, setEditandoId] = useState(null); // null = ninguna, 'nueva' = creando, o el id del item
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    apiFetch('/catalogo-hardware', { token }).then(setItems).catch((err) => setError(err.message));
  }
  useEffect(() => {
    cargar();
    apiFetch('/catalogo-implementacion/tecnologias', { token }).then(setTecnologias).catch(() => {});
  }, [token]);

  const itemsFiltrados = q
    ? items.filter((it) => `${it.nombre} ${it.sku || ''} ${it.numero_parte || ''}`.toLowerCase().includes(q.toLowerCase()))
    : items;

  function empezarNueva() {
    setEditandoId('nueva');
    setForm(formularioVacio());
  }
  function empezarEdicion(it) {
    setEditandoId(it.id);
    setForm({
      nombre: it.nombre, marca: it.marca || '', sku: it.sku || '', numeroParte: it.numero_parte || '', descripcion: it.descripcion || '',
      precio: String(it.precio), moneda: it.moneda || 'COP',
      tecnologiaImplSugeridaId: it.tecnologia_impl_sugerida_id ? String(it.tecnologia_impl_sugerida_id) : '',
    });
  }
  function cancelar() {
    setEditandoId(null);
    setForm(null);
  }

  async function guardar() {
    setError('');
    setGuardando(true);
    try {
      const payload = {
        nombre: form.nombre,
        marca: form.marca || undefined,
        sku: form.sku || undefined,
        numeroParte: form.numeroParte || undefined,
        descripcion: form.descripcion || undefined,
        precio: Number(form.precio) || 0,
        moneda: form.moneda,
        tecnologiaImplSugeridaId: form.tecnologiaImplSugeridaId ? Number(form.tecnologiaImplSugeridaId) : undefined,
      };
      if (editandoId === 'nueva') {
        await apiFetch('/catalogo-hardware', { method: 'POST', token, body: payload });
      } else {
        await apiFetch(`/catalogo-hardware/${editandoId}`, { method: 'PUT', token, body: payload });
      }
      cancelar();
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(it) {
    setError('');
    try {
      await apiFetch(`/catalogo-hardware/${it.id}`, { method: 'DELETE', token });
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="content">
      <PageHeader title="Biblioteca de Hardware" subtitle="Catálogo de equipos y SKU disponibles para armar BOMs." />
      {error && <div className="alert alert-danger">{error}</div>}

      {editandoId === 'nueva' && <FormularioItem form={form} setForm={setForm} tecnologias={tecnologias} guardar={guardar} cancelar={cancelar} guardando={guardando} />}

      <div className="row-between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        {editandoId === null && (
          <Button onClick={empezarNueva}><IconPlus width={14} height={14} /> Nuevo ítem</Button>
        )}
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, SKU o número de parte..." style={{ maxWidth: 320 }} />
      </div>

      <Card>
        {itemsFiltrados.length === 0 ? (
          <EmptyState icon={IconBox} description="No hay ítems de hardware en el catálogo." />
        ) : (
          <div className="table-wrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Nombre</th><th>Marca</th><th>SKU</th><th>Descripción</th><th>Precio de lista</th><th></th>
                </tr>
              </thead>
              <tbody>
                {itemsFiltrados.map((it) => (
                  <Fragment key={it.id}>
                    <tr>
                      <td style={{ fontWeight: 600 }}>{it.nombre}</td>
                      <td className="muted">{it.marca || '—'}</td>
                      <td className="muted">{it.sku || '—'}</td>
                      <td className="text-sm muted">{it.descripcion || '—'}</td>
                      <td>${money(it.precio)} {it.moneda || 'COP'}</td>
                      <td>
                        <div className="row">
                          <Button size="sm" variant="outline" onClick={() => empezarEdicion(it)}>Editar</Button>
                          <Button size="sm" variant="ghost" onClick={() => desactivar(it)} style={{ color: 'var(--nm-danger)' }}>
                            <IconTrash width={14} height={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {editandoId === it.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <FormularioItem form={form} setForm={setForm} tecnologias={tecnologias} guardar={guardar} cancelar={cancelar} guardando={guardando} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
