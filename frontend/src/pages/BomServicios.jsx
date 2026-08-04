import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import { IconTrash } from '../components/icons.jsx';

const COBERTURAS = ['24×7', '8×5', '8×6', '12×5', '12×6', 'Horario personalizado', 'Por demanda', 'Bajo bolsa de horas'];
const CANALES = ['Portal de clientes', 'CRM / ITSM', 'Correo electrónico', 'WhatsApp (P1)', 'Línea telefónica', 'Microsoft Teams', 'Chat corporativo', 'Reunión programada'];
const ENTREGABLES = ['Reporte mensual', 'Reporte trimestral', 'Informe ejecutivo', 'Informe técnico', 'Informe de incidentes', 'Informe SLA', 'RCA incidentes críticos', 'As-built', 'MOP', 'Acta de seguimiento'];
const EXCLS_BASE = ['Infraestructura no relacionada explícitamente en el alcance', 'Equipos sin soporte vigente del fabricante (salvo acuerdo explícito)', 'Reemplazo de hardware, partes, licencias o garantías', 'Costos de licenciamiento o renovación no especificados', 'Atención presencial si el servicio fue contratado en modalidad remota', 'Atención fuera de horario si la cobertura no lo contempla', 'Cambios de arquitectura no incluidos en el alcance', 'Proyectos de mejora, migraciones o upgrades mayores no pactados', 'Desarrollo de software o automatizaciones no especificadas', 'Responsabilidad sobre enlaces de telecomunicaciones de terceros o ISP', 'Recuperación ante desastres si no está incluida explícitamente', 'Gestión de vulnerabilidades o hardening si no está contratado', 'Actividades sin ticket, orden de servicio o autorización formal', 'Soporte sobre equipos sin acceso, credenciales o documentación del cliente'];
const SUPUESTOS_BASE = ['El cliente garantizará accesos remotos seguros y oportunos', 'El cliente mantendrá vigente el soporte y licenciamiento de fabricantes cuando aplique', 'El cliente entregará información técnica actualizada de la infraestructura', 'Las actividades fuera de horario deberán ser aprobadas previamente', 'Las ventanas de mantenimiento se coordinarán con anticipación mínima de 48 horas', 'El cumplimiento del SLA dependerá de disponibilidad de accesos, permisos y terceros', 'Los cambios productivos estarán sujetos a aprobación formal del cliente'];

const ESTADOS_LABEL = {
  borrador: 'Borrador', revision_lider: 'En revisión — Líder Técnico', aprobado_lider: 'Aprobado por Líder Técnico',
  revision_gerencia: 'En revisión — Gerencia', aprobado: 'Aprobado', generado: 'Generado final', rechazado: 'Rechazado',
};
const ESTADOS_BADGE = {
  borrador: 'neutral', revision_lider: 'warning', aprobado_lider: 'info',
  revision_gerencia: 'warning', aprobado: 'success', generado: 'success', rechazado: 'danger',
};

function humanizar(clave) {
  const conEspacios = clave.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
}
function inferirTipoCampo(clave) {
  if (/^incluye/i.test(clave) || /incluido$/i.test(clave)) return 'checkbox';
  if (/total|cantidad|dias|horas|vcpu|ram|gb|banda|uptime|retention|minimo|tickets/i.test(clave)) return 'number';
  return 'text';
}

export default function BomServicios() {
  const { id } = useParams();
  const { token, me } = useAuth();

  const [tipos, setTipos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [severidadesCatalogo, setSeveridadesCatalogo] = useState([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [spec, setSpec] = useState(null);

  const [tipoServicioId, setTipoServicioId] = useState('');
  const [form, setForm] = useState(null);

  useEffect(() => {
    async function cargar() {
      try {
        const [tps, cats, nvs, sevs] = await Promise.all([
          apiFetch('/catalogo-servicios/tipos', { token }),
          apiFetch('/catalogo-servicios/categorias-tecnologia', { token }),
          apiFetch('/catalogo-servicios/niveles', { token }),
          apiFetch('/catalogo-servicios/severidades', { token }),
        ]);
        setTipos(tps);
        setCategorias(cats);
        setNiveles(nvs);
        setSeveridadesCatalogo(sevs);

        try {
          const existente = await apiFetch(`/boms/${id}/especificacion`, { token });
          setSpec(existente);
          setTipoServicioId(existente.tipo_servicio_id);
          setForm(existente.datos_wizard);
        } catch {
          // Aun no existe especificacion para este BOM.
        }
      } catch (err) {
        setError(err.message);
      }
    }
    cargar();
  }, [id, token]);

  function seleccionarTipo(nuevoTipoId) {
    setTipoServicioId(nuevoTipoId);
    if (form) return;
    const tipo = tipos.find((t) => t.id === Number(nuevoTipoId));
    if (!tipo) return;
    setForm({
      modalidad: 'Remoto', cobertura: '8×5', vigencia: '12', fechaInicio: '', pais: 'Colombia', ciudad: '', moneda: 'COP',
      obsC: '', obsT: '',
      dimensionamiento: {},
      sla: severidadesCatalogo.map((s) => ({ clave: s.clave, nombreSeveridad: s.nombre_severidad, tiempoRespuesta: s.tiempo_respuesta, tiempoSolucion: s.tiempo_solucion })),
      escalamiento: (tipo.escalamientoDefault || []).map((e) => ({
        sev: e.severidad, ni: e.nivel_inicial, rnm: e.responsable_netmask, re: e.tiempo_respuesta, te: e.tiempo_escalamiento, sn: e.siguiente_nivel, canal: e.canal,
      })),
      escalamientoCliente: [],
      niveles: [], tecnologias: [], canales: [], entregables: [],
      exclusiones: [...EXCLS_BASE], supuestos: [...SUPUESTOS_BASE],
    });
  }

  function actualizarCampo(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }
  function actualizarDimensionamiento(clave, valor) {
    setForm((prev) => ({ ...prev, dimensionamiento: { ...prev.dimensionamiento, [clave]: valor } }));
  }
  function toggleEnLista(campo, valor) {
    setForm((prev) => {
      const lista = prev[campo] || [];
      return { ...prev, [campo]: lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor] };
    });
  }
  function actualizarSla(i, campo, valor) {
    setForm((prev) => ({ ...prev, sla: prev.sla.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)) }));
  }
  function actualizarEscalamiento(i, campo, valor) {
    setForm((prev) => ({ ...prev, escalamiento: prev.escalamiento.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)) }));
  }
  function agregarEscalamiento() {
    setForm((prev) => ({ ...prev, escalamiento: [...prev.escalamiento, { sev: 'P1', ni: '', rnm: '', re: '', te: '', sn: '', canal: '' }] }));
  }
  function quitarEscalamiento(i) {
    setForm((prev) => ({ ...prev, escalamiento: prev.escalamiento.filter((_, idx) => idx !== i) }));
  }
  function agregarEscalamientoCliente() {
    setForm((prev) => ({ ...prev, escalamientoCliente: [...prev.escalamientoCliente, { sev: 'P1', nombre: '', cargo: '', correo: '', telefono: '', disponibilidad: '24×7' }] }));
  }
  function actualizarEscalamientoCliente(i, campo, valor) {
    setForm((prev) => ({ ...prev, escalamientoCliente: prev.escalamientoCliente.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)) }));
  }
  function quitarEscalamientoCliente(i) {
    setForm((prev) => ({ ...prev, escalamientoCliente: prev.escalamientoCliente.filter((_, idx) => idx !== i) }));
  }
  function actualizarListaTexto(campo, i, valor) {
    setForm((prev) => ({ ...prev, [campo]: prev[campo].map((v, idx) => (idx === i ? valor : v)) }));
  }
  function agregarATexto(campo) {
    setForm((prev) => ({ ...prev, [campo]: [...prev[campo], ''] }));
  }
  function quitarDeTexto(campo, i) {
    setForm((prev) => ({ ...prev, [campo]: prev[campo].filter((_, idx) => idx !== i) }));
  }

  async function guardar() {
    setError('');
    setGuardando(true);
    try {
      const res = await apiFetch(`/boms/${id}/especificacion`, {
        method: 'PUT', token, body: { tipoServicioId: Number(tipoServicioId), datosWizard: form },
      });
      setSpec(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  async function ejecutarAccion(accion, comentario) {
    setError('');
    try {
      const res = await apiFetch(`/boms/${id}/especificacion/${accion}`, { method: 'POST', token, body: comentario ? { comentario } : {} });
      setSpec(res);
    } catch (err) {
      setError(err.message);
    }
  }

  const tipo = tipos.find((t) => t.id === Number(tipoServicioId));
  const editable = !spec || ['borrador', 'rechazado'].includes(spec.estado);
  const rol = me?.rol;

  return (
    <div className="content">
      <PageHeader back={`/boms/${id}`} title="Servicios Netmask" subtitle="Define el alcance, SLA y aprobación del servicio gestionado." />
      {error && <div className="alert alert-danger">{error}</div>}

      {spec && (
        <Card style={{ marginBottom: 20 }}>
          <div className="row-between">
            <div className="row">
              <strong>Estado:</strong> <Badge variant={ESTADOS_BADGE[spec.estado] || 'neutral'}>{ESTADOS_LABEL[spec.estado] || spec.estado}</Badge>
            </div>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              {spec.estado === 'borrador' && (rol === 'ingenieria' || rol === 'superadmin') && (
                <Button size="sm" onClick={() => ejecutarAccion('enviar-revision-lider')}>Enviar a revisión (Líder Técnico)</Button>
              )}
              {spec.estado === 'rechazado' && (rol === 'ingenieria' || rol === 'superadmin') && (
                <Button size="sm" onClick={() => ejecutarAccion('enviar-revision-lider')}>Reenviar a revisión</Button>
              )}
              {spec.estado === 'revision_lider' && (rol === 'lider_tecnico' || rol === 'superadmin') && (
                <>
                  <Button size="sm" onClick={() => ejecutarAccion('aprobar-lider')}>Aprobar (Líder Técnico)</Button>
                  <Button size="sm" variant="danger" onClick={() => ejecutarAccion('rechazar', 'Rechazado por líder técnico')}>Rechazar</Button>
                </>
              )}
              {spec.estado === 'aprobado_lider' && (rol === 'lider_tecnico' || rol === 'superadmin') && (
                <Button size="sm" onClick={() => ejecutarAccion('enviar-revision-gerencia')}>Enviar a revisión (Gerencia)</Button>
              )}
              {spec.estado === 'revision_gerencia' && (rol === 'gerencia' || rol === 'superadmin') && (
                <>
                  <Button size="sm" onClick={() => ejecutarAccion('aprobar-gerencia')}>Aprobar (Gerencia)</Button>
                  <Button size="sm" variant="danger" onClick={() => ejecutarAccion('rechazar', 'Rechazado por gerencia')}>Rechazar</Button>
                </>
              )}
              {spec.estado === 'aprobado' && (
                <Button size="sm" onClick={() => ejecutarAccion('marcar-generado')}>Marcar como generado</Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card title="Servicio" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Tipo de servicio</label>
          <select className="input" value={tipoServicioId} disabled={!editable && !!spec} onChange={(e) => seleccionarTipo(e.target.value)}>
            <option value="">-- Selecciona --</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </div>
        {tipo && (
          <div className="text-sm muted">
            <p>{tipo.descripcion}</p>
            <div className="form-grid-3">
              <div><strong style={{ color: 'var(--nm-text-2)' }}>Incluye</strong><ul>{tipo.incluye.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div>
              <div><strong style={{ color: 'var(--nm-text-2)' }}>Excluye</strong><ul>{tipo.excluye.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div>
              <div><strong style={{ color: 'var(--nm-text-2)' }}>Condiciones del cliente</strong><ul>{tipo.condiciones_cliente.map((i, idx) => <li key={idx}>{i}</li>)}</ul></div>
            </div>
          </div>
        )}
      </Card>

      {form && (
        <>
          <Card title="Datos generales" style={{ marginBottom: 16 }}>
            <div className="form-grid-3">
              <div className="field"><label>Modalidad</label>
                <select className="input" disabled={!editable} value={form.modalidad} onChange={(e) => actualizarCampo('modalidad', e.target.value)}>
                  <option>Remoto</option><option>En sitio</option><option>Híbrido</option>
                </select>
              </div>
              <div className="field"><label>Cobertura</label>
                <select className="input" disabled={!editable} value={form.cobertura} onChange={(e) => actualizarCampo('cobertura', e.target.value)}>
                  {COBERTURAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Vigencia (meses)</label>
                <input className="input" disabled={!editable} type="number" min="1" value={form.vigencia} onChange={(e) => actualizarCampo('vigencia', e.target.value)} />
              </div>
              <div className="field"><label>Fecha de inicio</label>
                <input className="input" disabled={!editable} type="date" value={form.fechaInicio} onChange={(e) => actualizarCampo('fechaInicio', e.target.value)} />
              </div>
              <div className="field"><label>País</label>
                <input className="input" disabled={!editable} value={form.pais} onChange={(e) => actualizarCampo('pais', e.target.value)} />
              </div>
              <div className="field"><label>Ciudad</label>
                <input className="input" disabled={!editable} value={form.ciudad} onChange={(e) => actualizarCampo('ciudad', e.target.value)} />
              </div>
            </div>
          </Card>

          {tipo && tipo.campos_dimensionamiento.length > 0 && (
            <Card title={`Dimensionamiento — ${tipo.nombre}`} style={{ marginBottom: 16 }}>
              <div className="form-grid">
                {tipo.campos_dimensionamiento.map((clave) => {
                  const tipoCampo = inferirTipoCampo(clave);
                  const valor = form.dimensionamiento[clave] ?? (tipoCampo === 'checkbox' ? false : '');
                  return (
                    <div className="field" key={clave}>
                      <label>{humanizar(clave)}</label>
                      {tipoCampo === 'checkbox' ? (
                        <input disabled={!editable} type="checkbox" checked={!!valor} onChange={(e) => actualizarDimensionamiento(clave, e.target.checked)} />
                      ) : (
                        <input className="input" disabled={!editable} type={tipoCampo} value={valor} onChange={(e) => actualizarDimensionamiento(clave, e.target.value)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card title="SLA por severidad" style={{ marginBottom: 16 }}>
            <div className="table-wrap">
              <table className="nm-table">
                <thead><tr><th>Severidad</th><th>Tiempo de respuesta</th><th>Tiempo de solución</th></tr></thead>
                <tbody>
                  {form.sla.map((s, i) => (
                    <tr key={s.clave}>
                      <td style={{ fontWeight: 600 }}>{s.nombreSeveridad}</td>
                      <td><input className="input" disabled={!editable} value={s.tiempoRespuesta} onChange={(e) => actualizarSla(i, 'tiempoRespuesta', e.target.value)} /></td>
                      <td><input className="input" disabled={!editable} value={s.tiempoSolucion} onChange={(e) => actualizarSla(i, 'tiempoSolucion', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Matriz de escalamiento (Netmask)" style={{ marginBottom: 16 }}>
            <div className="stack" style={{ marginBottom: 12 }}>
              {form.escalamiento.map((e, i) => (
                <div key={i} className="row" style={{ flexWrap: 'wrap' }}>
                  <input className="input" disabled={!editable} value={e.sev} onChange={(ev) => actualizarEscalamiento(i, 'sev', ev.target.value)} placeholder="Sev" style={{ width: 56 }} />
                  <input className="input" disabled={!editable} value={e.ni} onChange={(ev) => actualizarEscalamiento(i, 'ni', ev.target.value)} placeholder="Nivel inicial" style={{ flex: 1, minWidth: 110 }} />
                  <input className="input" disabled={!editable} value={e.rnm} onChange={(ev) => actualizarEscalamiento(i, 'rnm', ev.target.value)} placeholder="Responsable" style={{ flex: 1, minWidth: 110 }} />
                  <input className="input" disabled={!editable} value={e.re} onChange={(ev) => actualizarEscalamiento(i, 're', ev.target.value)} placeholder="T. resp." style={{ width: 90 }} />
                  <input className="input" disabled={!editable} value={e.te} onChange={(ev) => actualizarEscalamiento(i, 'te', ev.target.value)} placeholder="T. escal." style={{ width: 90 }} />
                  <input className="input" disabled={!editable} value={e.sn} onChange={(ev) => actualizarEscalamiento(i, 'sn', ev.target.value)} placeholder="Siguiente nivel" style={{ flex: 1, minWidth: 110 }} />
                  <input className="input" disabled={!editable} value={e.canal} onChange={(ev) => actualizarEscalamiento(i, 'canal', ev.target.value)} placeholder="Canal" style={{ flex: 1, minWidth: 110 }} />
                  {editable && <Button variant="ghost" size="sm" onClick={() => quitarEscalamiento(i)} style={{ color: 'var(--nm-danger)' }}><IconTrash width={14} height={14} /></Button>}
                </div>
              ))}
            </div>
            {editable && <Button variant="outline" size="sm" onClick={agregarEscalamiento}>+ Agregar nivel</Button>}

            <h4 style={{ fontSize: 13, marginTop: 20, marginBottom: 10, color: 'var(--nm-text-2)' }}>Contactos de escalamiento del cliente</h4>
            <div className="stack" style={{ marginBottom: 12 }}>
              {(form.escalamientoCliente || []).map((c, i) => (
                <div key={i} className="row" style={{ flexWrap: 'wrap' }}>
                  <input className="input" disabled={!editable} value={c.sev} onChange={(ev) => actualizarEscalamientoCliente(i, 'sev', ev.target.value)} placeholder="Sev" style={{ width: 56 }} />
                  <input className="input" disabled={!editable} value={c.nombre} onChange={(ev) => actualizarEscalamientoCliente(i, 'nombre', ev.target.value)} placeholder="Nombre" style={{ flex: 1, minWidth: 110 }} />
                  <input className="input" disabled={!editable} value={c.cargo} onChange={(ev) => actualizarEscalamientoCliente(i, 'cargo', ev.target.value)} placeholder="Cargo" style={{ flex: 1, minWidth: 110 }} />
                  <input className="input" disabled={!editable} value={c.correo} onChange={(ev) => actualizarEscalamientoCliente(i, 'correo', ev.target.value)} placeholder="Correo" style={{ flex: 1, minWidth: 130 }} />
                  <input className="input" disabled={!editable} value={c.telefono} onChange={(ev) => actualizarEscalamientoCliente(i, 'telefono', ev.target.value)} placeholder="Teléfono" style={{ flex: 1, minWidth: 110 }} />
                  {editable && <Button variant="ghost" size="sm" onClick={() => quitarEscalamientoCliente(i)} style={{ color: 'var(--nm-danger)' }}><IconTrash width={14} height={14} /></Button>}
                </div>
              ))}
            </div>
            {editable && <Button variant="outline" size="sm" onClick={agregarEscalamientoCliente}>+ Agregar contacto</Button>}
          </Card>

          <Card title="Ingeniería & Tecnología" style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Niveles</strong>
            <div className="row" style={{ flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
              {niveles.map((n) => (
                <label key={n.id} className="checkbox-row">
                  <input disabled={!editable} type="checkbox" checked={form.niveles.includes(n.nombre)} onChange={() => toggleEnLista('niveles', n.nombre)} /> {n.nombre}
                </label>
              ))}
            </div>
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Categorías tecnológicas</strong>
            <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
              {categorias.map((c) => (
                <label key={c.id} className="checkbox-row">
                  <input disabled={!editable} type="checkbox" checked={form.tecnologias.includes(c.nombre)} onChange={() => toggleEnLista('tecnologias', c.nombre)} /> {c.nombre}
                </label>
              ))}
            </div>
          </Card>

          <Card title="Canales & Entregables" style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Canales de comunicación</strong>
            <div className="row" style={{ flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
              {CANALES.map((c) => (
                <label key={c} className="checkbox-row">
                  <input disabled={!editable} type="checkbox" checked={form.canales.includes(c)} onChange={() => toggleEnLista('canales', c)} /> {c}
                </label>
              ))}
            </div>
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Entregables</strong>
            <div className="row" style={{ flexWrap: 'wrap', marginTop: 8 }}>
              {ENTREGABLES.map((e) => (
                <label key={e} className="checkbox-row">
                  <input disabled={!editable} type="checkbox" checked={form.entregables.includes(e)} onChange={() => toggleEnLista('entregables', e)} /> {e}
                </label>
              ))}
            </div>
          </Card>

          <Card title="Alcance & Exclusiones" style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Exclusiones</strong>
            <div className="stack" style={{ margin: '8px 0 10px' }}>
              {form.exclusiones.map((v, i) => (
                <div key={i} className="row">
                  <input className="input" disabled={!editable} value={v} onChange={(e) => actualizarListaTexto('exclusiones', i, e.target.value)} />
                  {editable && <Button variant="ghost" size="sm" onClick={() => quitarDeTexto('exclusiones', i)} style={{ color: 'var(--nm-danger)' }}><IconTrash width={14} height={14} /></Button>}
                </div>
              ))}
            </div>
            {editable && <Button variant="outline" size="sm" onClick={() => agregarATexto('exclusiones')}>+ Agregar exclusión</Button>}

            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)', display: 'block', marginTop: 20 }}>Supuestos</strong>
            <div className="stack" style={{ margin: '8px 0 10px' }}>
              {form.supuestos.map((v, i) => (
                <div key={i} className="row">
                  <input className="input" disabled={!editable} value={v} onChange={(e) => actualizarListaTexto('supuestos', i, e.target.value)} />
                  {editable && <Button variant="ghost" size="sm" onClick={() => quitarDeTexto('supuestos', i)} style={{ color: 'var(--nm-danger)' }}><IconTrash width={14} height={14} /></Button>}
                </div>
              ))}
            </div>
            {editable && <Button variant="outline" size="sm" onClick={() => agregarATexto('supuestos')}>+ Agregar supuesto</Button>}

            <div className="field" style={{ marginTop: 20 }}>
              <label>Observaciones comerciales</label>
              <textarea className="input" rows={3} disabled={!editable} value={form.obsC} onChange={(e) => actualizarCampo('obsC', e.target.value)} />
            </div>
            <div className="field">
              <label>Observaciones técnicas</label>
              <textarea className="input" rows={3} disabled={!editable} value={form.obsT} onChange={(e) => actualizarCampo('obsT', e.target.value)} />
            </div>
          </Card>

          {editable && (
            <Button onClick={guardar} disabled={guardando} style={{ marginBottom: 24 }}>
              {guardando ? 'Guardando...' : 'Guardar especificación'}
            </Button>
          )}
        </>
      )}

      {spec?.historial?.length > 0 && (
        <Card title="Historial de estados">
          <ul className="text-sm muted" style={{ margin: 0, paddingLeft: 18 }}>
            {spec.historial.map((h) => (
              <li key={h.id} style={{ marginBottom: 4 }}>{new Date(h.fecha).toLocaleString('es-CO')} — {h.estado_anterior || '—'} → {h.estado_nuevo} ({h.usuario_nombre}){h.comentario ? `: ${h.comentario}` : ''}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
