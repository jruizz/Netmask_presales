import { useEffect, useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Field from '../components/Field.jsx';

// Componente de nivel superior (no anidado dentro de Usuarios): si se define
// adentro, React lo trata como un tipo de componente nuevo en cada render y
// remonta los inputs, perdiendo el foco despues de cada tecla.
function FormularioEdicion({ form, setForm, roles, guardar, cancelar, guardando }) {
  return (
    <tr>
      <td colSpan={6} style={{ padding: '12px 0' }}>
        <form onSubmit={guardar} className="form-grid" style={{ alignItems: 'end' }}>
          <Field label="Nombre">
            <input className="input" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </Field>
          <Field label="Correo">
            <input className="input" required type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
          </Field>
          <Field label="Rol">
            <select className="input" required value={form.rolClave} onChange={(e) => setForm({ ...form, rolClave: e.target.value })}>
              {roles.map((r) => <option key={r.id} value={r.clave}>{r.nombre_visible}</option>)}
            </select>
          </Field>
          <Field label="Nueva contraseña (opcional)">
            <input className="input" type="password" minLength={8} placeholder="Dejar en blanco para no cambiarla"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <div className="row" style={{ gridColumn: 'span 1' }}>
            <Button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
            <Button variant="outline" onClick={cancelar}>Cancelar</Button>
          </div>
        </form>
      </td>
    </tr>
  );
}

export default function Usuarios() {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permisosDisponibles, setPermisosDisponibles] = useState([]);
  const [nuevo, setNuevo] = useState({ nombre: '', correo: '', password: '', rolClave: '' });
  const [error, setError] = useState('');
  const [guardandoRol, setGuardandoRol] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  function cargarTodo() {
    apiFetch('/usuarios', { token }).then(setUsuarios).catch((err) => setError(err.message));
    apiFetch('/roles', { token }).then(setRoles).catch((err) => setError(err.message));
    apiFetch('/roles/permisos-disponibles', { token }).then(setPermisosDisponibles).catch(() => {});
  }
  useEffect(cargarTodo, [token]);

  async function crearUsuario(e) {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/usuarios', { method: 'POST', token, body: nuevo });
      setNuevo({ nombre: '', correo: '', password: '', rolClave: '' });
      cargarTodo();
    } catch (err) {
      setError(err.message);
    }
  }

  async function cambiarEstado(id, activo) {
    setError('');
    try {
      await apiFetch(`/usuarios/${id}/estado`, { method: 'PATCH', token, body: { activo } });
      cargarTodo();
    } catch (err) {
      setError(err.message);
    }
  }

  function empezarEdicion(u) {
    setEditandoId(u.id);
    setForm({ nombre: u.nombre, correo: u.correo, rolClave: u.rol, password: '' });
  }
  function cancelarEdicion() {
    setEditandoId(null);
    setForm(null);
  }

  async function guardarEdicion(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const body = { nombre: form.nombre, correo: form.correo, rolClave: form.rolClave };
      if (form.password) body.password = form.password;
      await apiFetch(`/usuarios/${editandoId}`, { method: 'PUT', token, body });
      cancelarEdicion();
      cargarTodo();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function togglePermiso(rol, clave) {
    const tieneAhora = rol.permisos.includes(clave);
    const nuevos = tieneAhora ? rol.permisos.filter((p) => p !== clave) : [...rol.permisos, clave];
    setGuardandoRol(rol.clave);
    setError('');
    try {
      const actualizados = await apiFetch(`/roles/${rol.id}/permisos`, { method: 'PUT', token, body: { permisos: nuevos } });
      setRoles(actualizados);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoRol('');
    }
  }

  return (
    <div className="content content-wide">
      <PageHeader title="Usuarios y Roles" subtitle="Gestión de cuentas y matriz de permisos por rol." />
      {error && <div className="alert alert-danger">{error}</div>}

      <Card title="Usuarios" style={{ marginBottom: 20 }}>
        <div className="table-wrap" style={{ marginBottom: 20 }}>
          <table className="nm-table">
            <thead>
              <tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Activo</th><th>Último login</th><th></th></tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                editandoId === u.id ? (
                  <FormularioEdicion key={u.id} form={form} setForm={setForm} roles={roles} guardar={guardarEdicion} cancelar={cancelarEdicion} guardando={guardando} />
                ) : (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                    <td className="muted">{u.correo}</td>
                    <td>{u.rol}</td>
                    <td><Badge variant={u.activo ? 'success' : 'neutral'}>{u.activo ? 'Sí' : 'No'}</Badge></td>
                    <td className="muted">{u.ultimo_login ? new Date(u.ultimo_login).toLocaleString('es-CO') : '—'}</td>
                    <td>
                      <div className="row">
                        <Button variant="outline" size="sm" onClick={() => empezarEdicion(u)}>Editar</Button>
                        <Button variant="outline" size="sm" onClick={() => cambiarEstado(u.id, !u.activo)}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--nm-text-muted)', marginBottom: 12 }}>
          Crear usuario
        </h4>
        <form onSubmit={crearUsuario} className="form-grid" style={{ alignItems: 'end' }}>
          <Field label="Nombre">
            <input className="input" required value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          </Field>
          <Field label="Correo">
            <input className="input" required type="email" value={nuevo.correo} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} />
          </Field>
          <Field label="Contraseña">
            <input className="input" required type="password" minLength={8} value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} />
          </Field>
          <Field label="Rol">
            <select className="input" required value={nuevo.rolClave} onChange={(e) => setNuevo({ ...nuevo, rolClave: e.target.value })}>
              <option value="">--</option>
              {roles.map((r) => <option key={r.id} value={r.clave}>{r.nombre_visible}</option>)}
            </select>
          </Field>
          <Button type="submit" style={{ gridColumn: 'span 1' }}>Crear</Button>
        </form>
      </Card>

      <Card title="Matriz de permisos por rol" subtitle='El rol "superadmin" siempre tiene todos los permisos y no es editable.'>
        <div className="table-wrap">
          <table className="nm-table">
            <thead>
              <tr>
                <th>Permiso</th>
                {roles.map((r) => <th key={r.id} style={{ textAlign: 'center' }}>{r.nombre_visible}{guardandoRol === r.clave ? ' ⏳' : ''}</th>)}
              </tr>
            </thead>
            <tbody>
              {permisosDisponibles.map((p) => (
                <tr key={p.id}>
                  <td className="muted">{p.clave}</td>
                  {roles.map((r) => (
                    <td key={r.id} style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={r.permisos.includes(p.clave)}
                        disabled={r.clave === 'superadmin' || guardandoRol === r.clave}
                        onChange={() => togglePermiso(r, p.clave)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
