import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import { IconTrash, IconPlus, IconChevronRight } from '../components/icons.jsx';

function actividadVacia() {
  return { texto: '', horas: 1, modo: 'en_sitio' };
}

function formularioVacio() {
  return { grupoNombre: '', nombre: '', actividades: [actividadVacia()] };
}

// Componente de nivel superior (no anidado dentro de otro componente): si se
// define adentro, React lo trata como un tipo de componente nuevo en cada
// render y remonta los inputs, perdiendo el foco despues de cada tecla.
function FormularioActividades({ form, setForm, gruposDeLaMarca, guardar, cancelar, guardando }) {
  function actualizarActividad(i, campo, valor) {
    setForm((prev) => ({ ...prev, actividades: prev.actividades.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)) }));
  }
  function agregarActividad() {
    setForm((prev) => ({ ...prev, actividades: [...prev.actividades, actividadVacia()] }));
  }
  function quitarActividad(i) {
    setForm((prev) => ({ ...prev, actividades: prev.actividades.filter((_, idx) => idx !== i) }));
  }

  return (
    <Card style={{ marginBottom: 20 }}>
      <div className="form-grid" style={{ marginBottom: 14 }}>
        <div className="field">
          <label>Grupo</label>
          <input
            className="input" required list="grupos-existentes" value={form.grupoNombre}
            onChange={(e) => setForm({ ...form, grupoNombre: e.target.value })}
            placeholder="Ej. Firewalls — elige uno existente o escribe uno nuevo"
          />
          <datalist id="grupos-existentes">
            {gruposDeLaMarca.map((g) => <option key={g} value={g} />)}
          </datalist>
        </div>
        <div className="field">
          <label>Nombre de la tecnología</label>
          <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Firewall Fortigate" />
        </div>
      </div>

      <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--nm-text-muted)', marginBottom: 10 }}>
        Actividades
      </h4>
      <p className="text-sm muted" style={{ marginTop: -4, marginBottom: 12 }}>
        La cantidad de equipos se define al configurar la Implementación de cada proyecto, no aquí.
      </p>
      <div className="stack" style={{ marginBottom: 12 }}>
        {form.actividades.map((a, i) => (
          <div key={i} className="row" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, minWidth: 260, marginBottom: 0 }}>
              <label>Descripción</label>
              <input className="input" value={a.texto} onChange={(e) => actualizarActividad(i, 'texto', e.target.value)} placeholder="Descripción de la actividad" />
            </div>
            <div className="field" style={{ width: 90, marginBottom: 0 }}>
              <label>Horas</label>
              <input className="input" type="number" min="0" step="0.25" value={a.horas} onChange={(e) => actualizarActividad(i, 'horas', Number(e.target.value))} />
            </div>
            <div className="field" style={{ width: 130, marginBottom: 0 }}>
              <label>Modalidad</label>
              <select className="input" value={a.modo} onChange={(e) => actualizarActividad(i, 'modo', e.target.value)}>
                <option value="en_sitio">En sitio</option>
                <option value="remota">Remota</option>
              </select>
            </div>
            {form.actividades.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => quitarActividad(i)} style={{ color: 'var(--nm-danger)' }}><IconTrash width={14} height={14} /></Button>
            )}
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={agregarActividad} style={{ marginBottom: 16 }}><IconPlus width={14} height={14} /> Agregar actividad</Button>

      <div className="row">
        <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
        <Button variant="outline" onClick={cancelar}>Cancelar</Button>
      </div>
    </Card>
  );
}

// Vista de detalle de una marca: grupos > tecnologias > actividades. Es la
// misma pantalla que existia antes de separar por marca, solo que ahora
// filtrada a `marca` y con el campo Grupo como select-o-crea-nuevo.
function VistaMarca({ marca, tecnologias, onVolver, recargar, token }) {
  const [error, setError] = useState('');
  const [editandoId, setEditandoId] = useState(null); // null = ninguna, 'nueva' = creando, o el id de la tecnologia
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const tecsDeLaMarca = tecnologias.filter((t) => t.marca_id === marca.id);
  const grupos = tecsDeLaMarca.reduce((acc, t) => {
    (acc[t.grupo_nombre] ||= []).push(t);
    return acc;
  }, {});
  const gruposDeLaMarca = Object.keys(grupos);

  function empezarNueva() {
    setEditandoId('nueva');
    setForm(formularioVacio());
  }
  function empezarEdicion(t) {
    setEditandoId(t.id);
    setForm({
      grupoNombre: t.grupo_nombre,
      nombre: t.nombre,
      actividades: (t.actividades || []).map((a) => ({ texto: a.texto, horas: Number(a.horas), modo: a.modo })),
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
        marcaId: marca.id,
        grupoNombre: form.grupoNombre,
        nombre: form.nombre,
        // unidadesPorEquipo se mantiene en 1 por defecto: la cantidad de equipos
        // se define en el wizard de Implementacion de cada BOM, no en la biblioteca.
        actividades: form.actividades.map((a) => ({ texto: a.texto, horas: Number(a.horas), modo: a.modo, unidadesPorEquipo: 1 })),
      };
      if (editandoId === 'nueva') {
        await apiFetch('/catalogo-implementacion/tecnologias', { method: 'POST', token, body: payload });
      } else {
        await apiFetch(`/catalogo-implementacion/tecnologias/${editandoId}`, { method: 'PUT', token, body: payload });
      }
      cancelar();
      recargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function desactivar(t) {
    setError('');
    try {
      await apiFetch(`/catalogo-implementacion/tecnologias/${t.id}`, { method: 'DELETE', token });
      recargar();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <button type="button" onClick={onVolver} className="text-sm" style={{ background: 'none', border: 'none', color: 'var(--nm-blue)', cursor: 'pointer', padding: 0, marginBottom: 14 }}>
        ← Volver a marcas
      </button>
      <PageHeader title={marca.nombre} subtitle="Tecnologías y actividades del catálogo de Implementación — horas por defecto de cada actividad." />
      {error && <div className="alert alert-danger">{error}</div>}

      {editandoId === 'nueva' && (
        <FormularioActividades form={form} setForm={setForm} gruposDeLaMarca={gruposDeLaMarca} guardar={guardar} cancelar={cancelar} guardando={guardando} />
      )}

      {editandoId === null && (
        <Button onClick={empezarNueva} style={{ marginBottom: 20 }}><IconPlus width={14} height={14} /> Nueva tecnología</Button>
      )}

      {Object.entries(grupos).map(([grupo, techs]) => (
        <Card key={grupo} title={grupo} style={{ marginBottom: 16 }}>
          {techs.map((t) => (
            <div key={t.id} style={{ borderBottom: '1px solid var(--nm-border)', padding: '10px 0' }}>
              {editandoId === t.id ? (
                <FormularioActividades form={form} setForm={setForm} gruposDeLaMarca={gruposDeLaMarca} guardar={guardar} cancelar={cancelar} guardando={guardando} />
              ) : (
                <div className="row-between">
                  <div className="row">
                    <span style={{ fontWeight: 600 }}>{t.nombre}</span>
                    {t.es_base && <Badge variant="neutral">base</Badge>}
                    <span className="text-sm muted">{(t.actividades || []).length} actividad(es)</span>
                  </div>
                  <div className="row">
                    <Button size="sm" variant="outline" onClick={() => empezarEdicion(t)}>Editar</Button>
                    <Button size="sm" variant="ghost" onClick={() => desactivar(t)} style={{ color: 'var(--nm-danger)' }}>
                      <IconTrash width={14} height={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      ))}

      {gruposDeLaMarca.length === 0 && editandoId === null && (
        <p className="text-sm muted">Esta marca todavía no tiene tecnologías. Usa "Nueva tecnología" para agregar la primera.</p>
      )}
    </div>
  );
}

export default function CatalogoImplementacion() {
  const { token } = useAuth();
  const [marcas, setMarcas] = useState([]);
  const [tecnologias, setTecnologias] = useState([]);
  const [marcaSeleccionada, setMarcaSeleccionada] = useState(null);
  const [error, setError] = useState('');
  const [nuevaMarca, setNuevaMarca] = useState('');
  const [creandoMarca, setCreandoMarca] = useState(false);
  const [guardandoMarca, setGuardandoMarca] = useState(false);

  function cargar() {
    Promise.all([
      apiFetch('/catalogo-implementacion/marcas', { token }),
      apiFetch('/catalogo-implementacion/tecnologias', { token }),
    ]).then(([m, t]) => { setMarcas(m); setTecnologias(t); }).catch((err) => setError(err.message));
  }
  useEffect(cargar, [token]);

  async function guardarMarca(e) {
    e.preventDefault();
    if (!nuevaMarca.trim()) return;
    setError('');
    setGuardandoMarca(true);
    try {
      await apiFetch('/catalogo-implementacion/marcas', { method: 'POST', token, body: { nombre: nuevaMarca.trim() } });
      setNuevaMarca('');
      setCreandoMarca(false);
      cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoMarca(false);
    }
  }

  if (marcaSeleccionada) {
    const marcaActual = marcas.find((m) => m.id === marcaSeleccionada) || { id: marcaSeleccionada, nombre: '' };
    return (
      <div className="content">
        <VistaMarca
          marca={marcaActual}
          tecnologias={tecnologias}
          token={token}
          onVolver={() => setMarcaSeleccionada(null)}
          recargar={cargar}
        />
      </div>
    );
  }

  return (
    <div className="content">
      <PageHeader title="Biblioteca de Implementación" subtitle="Marcas/vendors del catálogo de Implementación. Entra a una para ver o crear sus tecnologías." />
      {error && <div className="alert alert-danger">{error}</div>}

      {creandoMarca ? (
        <form onSubmit={guardarMarca} className="row" style={{ marginBottom: 20 }}>
          <input className="input" autoFocus required value={nuevaMarca} onChange={(e) => setNuevaMarca(e.target.value)} placeholder="Ej. Aruba" style={{ maxWidth: 260 }} />
          <Button type="submit" disabled={guardandoMarca}>{guardandoMarca ? 'Guardando...' : 'Guardar'}</Button>
          <Button variant="outline" onClick={() => { setCreandoMarca(false); setNuevaMarca(''); }}>Cancelar</Button>
        </form>
      ) : (
        <Button onClick={() => setCreandoMarca(true)} style={{ marginBottom: 20 }}><IconPlus width={14} height={14} /> Nueva marca</Button>
      )}

      <div className="stack">
        {marcas.map((m) => {
          const count = tecnologias.filter((t) => t.marca_id === m.id).length;
          return (
            <button key={m.id} type="button" onClick={() => setMarcaSeleccionada(m.id)}
              className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', cursor: 'pointer', background: 'var(--nm-surface)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{m.nombre}</div>
                <div className="text-sm muted">{count} tecnología(s)</div>
              </div>
              <IconChevronRight width={18} height={18} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
