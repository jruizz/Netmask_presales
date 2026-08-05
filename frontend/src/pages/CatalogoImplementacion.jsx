import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import { IconTrash, IconPlus } from '../components/icons.jsx';

function actividadVacia() {
  return { texto: '', horas: 1, modo: 'en_sitio', unidadesPorEquipo: 1 };
}

function formularioVacio() {
  return { grupoNombre: '', nombre: '', actividades: [actividadVacia()] };
}

export default function CatalogoImplementacion() {
  const { token } = useAuth();
  const [tecnologias, setTecnologias] = useState([]);
  const [error, setError] = useState('');
  const [editandoId, setEditandoId] = useState(null); // null = ninguna, 'nueva' = creando, o el id de la tecnologia
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function cargar() {
    apiFetch('/catalogo-implementacion/tecnologias', { token }).then(setTecnologias).catch((err) => setError(err.message));
  }
  useEffect(cargar, [token]);

  const grupos = tecnologias.reduce((acc, t) => {
    (acc[t.grupo_nombre] ||= []).push(t);
    return acc;
  }, {});

  function empezarNueva() {
    setEditandoId('nueva');
    setForm(formularioVacio());
  }
  function empezarEdicion(t) {
    setEditandoId(t.id);
    setForm({
      grupoNombre: t.grupo_nombre,
      nombre: t.nombre,
      actividades: (t.actividades || []).map((a) => ({
        texto: a.texto, horas: Number(a.horas), modo: a.modo, unidadesPorEquipo: Number(a.unidades_por_equipo) || 1,
      })),
    });
  }
  function cancelar() {
    setEditandoId(null);
    setForm(null);
  }

  function actualizarActividad(i, campo, valor) {
    setForm((prev) => ({ ...prev, actividades: prev.actividades.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a)) }));
  }
  function agregarActividad() {
    setForm((prev) => ({ ...prev, actividades: [...prev.actividades, actividadVacia()] }));
  }
  function quitarActividad(i) {
    setForm((prev) => ({ ...prev, actividades: prev.actividades.filter((_, idx) => idx !== i) }));
  }

  async function guardar() {
    setError('');
    setGuardando(true);
    try {
      const payload = {
        grupoNombre: form.grupoNombre,
        nombre: form.nombre,
        actividades: form.actividades.map((a) => ({
          texto: a.texto, horas: Number(a.horas), modo: a.modo, unidadesPorEquipo: Number(a.unidadesPorEquipo) || 1,
        })),
      };
      if (editandoId === 'nueva') {
        await apiFetch('/catalogo-implementacion/tecnologias', { method: 'POST', token, body: payload });
      } else {
        await apiFetch(`/catalogo-implementacion/tecnologias/${editandoId}`, { method: 'PUT', token, body: payload });
      }
      cancelar();
      cargar();
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
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  function FormularioActividades() {
    return (
      <Card style={{ marginBottom: 20 }}>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <div className="field">
            <label>Grupo</label>
            <input className="input" required value={form.grupoNombre} onChange={(e) => setForm({ ...form, grupoNombre: e.target.value })} placeholder="Ej. Switching e Inalambrico" />
          </div>
          <div className="field">
            <label>Nombre de la tecnología</label>
            <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Firewall Fortigate" />
          </div>
        </div>

        <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--nm-text-muted)', marginBottom: 10 }}>
          Actividades
        </h4>
        <div className="stack" style={{ marginBottom: 12 }}>
          {form.actividades.map((a, i) => (
            <div key={i} className="row" style={{ flexWrap: 'wrap' }}>
              <input className="input" value={a.texto} onChange={(e) => actualizarActividad(i, 'texto', e.target.value)} placeholder="Descripción de la actividad" style={{ flex: 1, minWidth: 260 }} />
              <input className="input" type="number" min="0" step="0.25" value={a.horas} onChange={(e) => actualizarActividad(i, 'horas', Number(e.target.value))} title="Horas" style={{ width: 80 }} />
              <select className="input" value={a.modo} onChange={(e) => actualizarActividad(i, 'modo', e.target.value)} style={{ width: 130 }}>
                <option value="en_sitio">En sitio</option>
                <option value="remota">Remota</option>
              </select>
              <input className="input" type="number" min="1" step="1" value={a.unidadesPorEquipo} onChange={(e) => actualizarActividad(i, 'unidadesPorEquipo', Math.max(1, Math.round(Number(e.target.value)) || 1))} title="Unidades por equipo" style={{ width: 90 }} />
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

  return (
    <div className="content">
      <PageHeader title="Biblioteca de Implementación" subtitle="Tecnologías y actividades del catálogo de Implementación — horas por defecto de cada actividad." />
      {error && <div className="alert alert-danger">{error}</div>}

      {editandoId === 'nueva' && <FormularioActividades />}

      {editandoId === null && (
        <Button onClick={empezarNueva} style={{ marginBottom: 20 }}><IconPlus width={14} height={14} /> Nueva tecnología</Button>
      )}

      {Object.entries(grupos).map(([grupo, techs]) => (
        <Card key={grupo} title={grupo} style={{ marginBottom: 16 }}>
          {techs.map((t) => (
            <div key={t.id} style={{ borderBottom: '1px solid var(--nm-border)', padding: '10px 0' }}>
              {editandoId === t.id ? (
                <FormularioActividades />
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
    </div>
  );
}
