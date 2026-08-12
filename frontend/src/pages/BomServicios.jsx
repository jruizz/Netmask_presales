import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import AprobacionBanner from '../components/AprobacionBanner.jsx';
import { IconTrash } from '../components/icons.jsx';
import Field from '../components/Field.jsx';

const COBERTURAS = ['24×7', '8×5', '8×6', '12×5', '12×6', 'Horario personalizado', 'Por demanda', 'Bajo bolsa de horas'];

// Agrupaciones tematicas para que las listas largas de checkboxes/exclusiones
// dejen de verse como un solo montón de opciones sin orden -- ver troubleshooting
// agosto 2026. Cada grupo es la fuente de verdad del orden por defecto; el/los
// arreglo(s) planos que el resto del formulario espera (CANALES, EXCLS_BASE, etc.)
// se derivan de aquí con flatMap para no duplicar los textos en dos lugares.
const CANALES_GRUPOS = [
  { titulo: 'Autoservicio y tickets', items: ['Portal de clientes', 'CRM / ITSM', 'Correo electrónico'] },
  { titulo: 'Comunicación directa', items: ['Línea telefónica', 'WhatsApp (P1)', 'Microsoft Teams', 'Chat corporativo'] },
  { titulo: 'Reuniones', items: ['Reunión programada'] },
];
const CANALES = CANALES_GRUPOS.flatMap((g) => g.items);

const ENTREGABLES_GRUPOS = [
  { titulo: 'Reportes periódicos', items: ['Reporte mensual', 'Reporte trimestral', 'Informe ejecutivo', 'Informe SLA'] },
  { titulo: 'Documentación técnica', items: ['Informe técnico', 'As-built', 'MOP'] },
  { titulo: 'Gestión de incidentes', items: ['Informe de incidentes', 'RCA incidentes críticos', 'Acta de seguimiento'] },
];
const ENTREGABLES = ENTREGABLES_GRUPOS.flatMap((g) => g.items);

// Categorias tecnologicas vienen del catalogo (BD), no de una constante local
// -- este mapa solo define el orden/agrupacion visual; cualquier categoria del
// catalogo que no aparezca aqui cae automaticamente en un grupo "Otras".
const CATEGORIAS_GRUPOS = [
  { titulo: 'Redes', items: ['Redes LAN / WAN', 'Switching', 'Routing', 'SD-WAN / VPN', 'WLAN / Wireless', 'Access Points', 'NAC'] },
  { titulo: 'Seguridad', items: ['Seguridad / Firewall'] },
  { titulo: 'Datacenter y Cloud', items: ['Datacenter', 'Servidores / Virtualización', 'Cloud / IaaS'] },
  { titulo: 'Operación y continuidad', items: ['Monitoreo', 'Backup'] },
  { titulo: 'Comunicaciones', items: ['Colaboración / Telefonía'] },
  { titulo: 'Software y datos', items: ['Aplicativos', 'Sistemas Operativos', 'Bases de datos'] },
];

const EXCLUSIONES_GRUPOS = [
  { titulo: 'Alcance y cobertura', items: ['Infraestructura no relacionada explícitamente en el alcance', 'Cambios de arquitectura no incluidos en el alcance', 'Proyectos de mejora, migraciones o upgrades mayores no pactados', 'Desarrollo de software o automatizaciones no especificadas', 'Recuperación ante desastres si no está incluida explícitamente', 'Gestión de vulnerabilidades o hardening si no está contratado'] },
  { titulo: 'Hardware y licenciamiento', items: ['Equipos sin soporte vigente del fabricante (salvo acuerdo explícito)', 'Reemplazo de hardware, partes, licencias o garantías', 'Costos de licenciamiento o renovación no especificados'] },
  { titulo: 'Modalidad y horario', items: ['Atención presencial si el servicio fue contratado en modalidad remota', 'Atención fuera de horario si la cobertura no lo contempla'] },
  { titulo: 'Terceros', items: ['Responsabilidad sobre enlaces de telecomunicaciones de terceros o ISP'] },
  { titulo: 'Procesos y autorización', items: ['Actividades sin ticket, orden de servicio o autorización formal', 'Soporte sobre equipos sin acceso, credenciales o documentación del cliente'] },
];
const EXCLS_BASE = EXCLUSIONES_GRUPOS.flatMap((g) => g.items);

const SUPUESTOS_GRUPOS = [
  { titulo: 'Accesos e información', items: ['El cliente garantizará accesos remotos seguros y oportunos', 'El cliente entregará información técnica actualizada de la infraestructura', 'El cumplimiento del SLA dependerá de disponibilidad de accesos, permisos y terceros'] },
  { titulo: 'Hardware y licenciamiento', items: ['El cliente mantendrá vigente el soporte y licenciamiento de fabricantes cuando aplique'] },
  { titulo: 'Procesos y aprobaciones', items: ['Las actividades fuera de horario deberán ser aprobadas previamente', 'Las ventanas de mantenimiento se coordinarán con anticipación mínima de 48 horas', 'Los cambios productivos estarán sujetos a aprobación formal del cliente'] },
];
const SUPUESTOS_BASE = SUPUESTOS_GRUPOS.flatMap((g) => g.items);

// Reparte una lista de opciones disponibles (strings u objetos {nombre}) en los
// grupos tematicos definidos arriba, para checkboxes de seleccion. Lo que no
// calza en ningun grupo conocido cae en un grupo final "Otras/otros".
function agruparDisponibles(disponibles, grupos, tituloResto) {
  const clave = (x) => (typeof x === 'string' ? x : x.nombre);
  const usados = new Set();
  const resultado = grupos.map(({ titulo, items }) => {
    const entradas = items.map((nombre) => disponibles.find((d) => clave(d) === nombre)).filter(Boolean);
    entradas.forEach((e) => usados.add(clave(e)));
    return { titulo, entradas };
  });
  const resto = disponibles.filter((d) => !usados.has(clave(d)));
  if (resto.length) resultado.push({ titulo: tituloResto, entradas: resto });
  return resultado.filter((g) => g.entradas.length > 0);
}

// Igual que agruparDisponibles, pero para listas de texto editable
// (exclusiones/supuestos): conserva el indice original de cada valor dentro
// del arreglo plano para que los botones de editar/quitar sigan apuntando al
// elemento correcto sin importar en que grupo visual quedo.
function agruparConIndices(valores, grupos, tituloResto) {
  const usados = new Set();
  const resultado = grupos.map(({ titulo, items }) => {
    const entradas = [];
    items.forEach((texto) => {
      const idx = valores.findIndex((v, i) => v === texto && !usados.has(i));
      if (idx !== -1) { entradas.push({ valor: valores[idx], index: idx }); usados.add(idx); }
    });
    return { titulo, entradas };
  });
  const resto = valores.map((v, i) => ({ valor: v, index: i })).filter(({ index }) => !usados.has(index));
  if (resto.length) resultado.push({ titulo: tituloResto, entradas: resto });
  return resultado.filter((g) => g.entradas.length > 0);
}


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
  const navigate = useNavigate();
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
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function aplicarYVolver() {
    const ok = await guardar();
    if (ok) navigate(`/boms/${id}`);
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
        <AprobacionBanner estado={spec.estado} historial={spec.historial} rol={rol} onAccion={ejecutarAccion} />
      )}

      <Card title="Servicio" style={{ marginBottom: 16 }}>
        <Field label="Tipo de servicio">
          <select className="input" value={tipoServicioId} disabled={!editable} onChange={(e) => seleccionarTipo(e.target.value)}>
            <option value="">-- Selecciona --</option>
            {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
          </select>
        </Field>
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
              <Field label="Modalidad">
                <select className="input" disabled={!editable} value={form.modalidad} onChange={(e) => actualizarCampo('modalidad', e.target.value)}>
                  <option>Remoto</option><option>En sitio</option><option>Híbrido</option>
                </select>
              </Field>
              <Field label="Cobertura">
                <select className="input" disabled={!editable} value={form.cobertura} onChange={(e) => actualizarCampo('cobertura', e.target.value)}>
                  {COBERTURAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Vigencia (meses)">
                <input className="input" disabled={!editable} type="number" min="1" value={form.vigencia} onChange={(e) => actualizarCampo('vigencia', e.target.value)} />
              </Field>
              <Field label="Fecha de inicio">
                <input className="input" disabled={!editable} type="date" value={form.fechaInicio} onChange={(e) => actualizarCampo('fechaInicio', e.target.value)} />
              </Field>
              <Field label="País">
                <input className="input" disabled={!editable} value={form.pais} onChange={(e) => actualizarCampo('pais', e.target.value)} />
              </Field>
              <Field label="Ciudad">
                <input className="input" disabled={!editable} value={form.ciudad} onChange={(e) => actualizarCampo('ciudad', e.target.value)} />
              </Field>
            </div>
          </Card>

          {tipo && tipo.campos_dimensionamiento.length > 0 && (
            <Card title={`Dimensionamiento — ${tipo.nombre}`} collapsible style={{ marginBottom: 16 }}>
              <div className="form-grid">
                {tipo.campos_dimensionamiento.map((clave) => {
                  const tipoCampo = inferirTipoCampo(clave);
                  const valor = form.dimensionamiento[clave] ?? (tipoCampo === 'checkbox' ? false : '');
                  return (
                    <Field label={humanizar(clave)} key={clave}>
                      {tipoCampo === 'checkbox' ? (
                        <input disabled={!editable} type="checkbox" checked={!!valor} onChange={(e) => actualizarDimensionamiento(clave, e.target.checked)} />
                      ) : (
                        <input className="input" disabled={!editable} type={tipoCampo} value={valor} onChange={(e) => actualizarDimensionamiento(clave, e.target.value)} />
                      )}
                    </Field>
                  );
                })}
              </div>
            </Card>
          )}

          <Card title="SLA por severidad" collapsible defaultOpen={false} style={{ marginBottom: 16 }}>
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

          <Card title="Matriz de escalamiento (Netmask)" collapsible defaultOpen={false} style={{ marginBottom: 16 }}>
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

          <Card
            title="Ingeniería & Tecnología"
            subtitle="Se incluyen como sección propia en la Especificación de Servicio generada."
            collapsible defaultOpen={false}
            actions={<span className="text-sm muted">{form.niveles.length} nivel(es) · {form.tecnologias.length} categoría(s)</span>}
            style={{ marginBottom: 16 }}
          >
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Niveles</strong>
            <div className="row" style={{ flexWrap: 'wrap', marginBottom: 20, marginTop: 8 }}>
              {niveles.map((n) => (
                <label key={n.id} className="checkbox-row">
                  <input disabled={!editable} type="checkbox" checked={form.niveles.includes(n.nombre)} onChange={() => toggleEnLista('niveles', n.nombre)} /> {n.nombre}
                </label>
              ))}
            </div>
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Categorías tecnológicas</strong>
            {agruparDisponibles(categorias, CATEGORIAS_GRUPOS, 'Otras').map(({ titulo, entradas }) => (
              <div key={titulo} style={{ marginTop: 10 }}>
                <div className="text-sm muted" style={{ marginBottom: 4 }}>{titulo}</div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  {entradas.map((c) => (
                    <label key={c.id} className="checkbox-row">
                      <input disabled={!editable} type="checkbox" checked={form.tecnologias.includes(c.nombre)} onChange={() => toggleEnLista('tecnologias', c.nombre)} /> {c.nombre}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          <Card
            title="Canales & Entregables"
            collapsible defaultOpen={false}
            actions={<span className="text-sm muted">{form.canales.length} canal(es) · {form.entregables.length} entregable(s)</span>}
            style={{ marginBottom: 16 }}
          >
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Canales de comunicación</strong>
            {agruparDisponibles(CANALES, CANALES_GRUPOS, 'Otros').map(({ titulo, entradas }) => (
              <div key={titulo} style={{ marginTop: 10 }}>
                <div className="text-sm muted" style={{ marginBottom: 4 }}>{titulo}</div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  {entradas.map((c) => (
                    <label key={c} className="checkbox-row">
                      <input disabled={!editable} type="checkbox" checked={form.canales.includes(c)} onChange={() => toggleEnLista('canales', c)} /> {c}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)', display: 'block', marginTop: 20 }}>Entregables</strong>
            {agruparDisponibles(ENTREGABLES, ENTREGABLES_GRUPOS, 'Otros').map(({ titulo, entradas }) => (
              <div key={titulo} style={{ marginTop: 10 }}>
                <div className="text-sm muted" style={{ marginBottom: 4 }}>{titulo}</div>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  {entradas.map((e) => (
                    <label key={e} className="checkbox-row">
                      <input disabled={!editable} type="checkbox" checked={form.entregables.includes(e)} onChange={() => toggleEnLista('entregables', e)} /> {e}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </Card>

          <Card
            title="Alcance & Exclusiones"
            collapsible defaultOpen={false}
            actions={<span className="text-sm muted">{form.exclusiones.length} exclusión(es) · {form.supuestos.length} supuesto(s)</span>}
            style={{ marginBottom: 16 }}
          >
            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)' }}>Exclusiones</strong>
            {agruparConIndices(form.exclusiones, EXCLUSIONES_GRUPOS, 'Personalizadas').map(({ titulo, entradas }) => (
              <div key={titulo} style={{ marginTop: 10 }}>
                <div className="text-sm muted" style={{ marginBottom: 4 }}>{titulo}</div>
                <div className="stack" style={{ margin: '4px 0 10px' }}>
                  {entradas.map(({ valor, index }) => (
                    <div key={index} className="row">
                      <input className="input" disabled={!editable} value={valor} onChange={(e) => actualizarListaTexto('exclusiones', index, e.target.value)} />
                      {editable && <Button variant="ghost" size="sm" onClick={() => quitarDeTexto('exclusiones', index)} style={{ color: 'var(--nm-danger)' }}><IconTrash width={14} height={14} /></Button>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {editable && <Button variant="outline" size="sm" onClick={() => agregarATexto('exclusiones')}>+ Agregar exclusión</Button>}

            <strong style={{ fontSize: 13, color: 'var(--nm-text-2)', display: 'block', marginTop: 24 }}>Supuestos</strong>
            {agruparConIndices(form.supuestos, SUPUESTOS_GRUPOS, 'Personalizados').map(({ titulo, entradas }) => (
              <div key={titulo} style={{ marginTop: 10 }}>
                <div className="text-sm muted" style={{ marginBottom: 4 }}>{titulo}</div>
                <div className="stack" style={{ margin: '4px 0 10px' }}>
                  {entradas.map(({ valor, index }) => (
                    <div key={index} className="row">
                      <input className="input" disabled={!editable} value={valor} onChange={(e) => actualizarListaTexto('supuestos', index, e.target.value)} />
                      {editable && <Button variant="ghost" size="sm" onClick={() => quitarDeTexto('supuestos', index)} style={{ color: 'var(--nm-danger)' }}><IconTrash width={14} height={14} /></Button>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {editable && <Button variant="outline" size="sm" onClick={() => agregarATexto('supuestos')}>+ Agregar supuesto</Button>}
          </Card>

          <Card title="Observaciones" collapsible defaultOpen={false} style={{ marginBottom: 16 }}>
            <Field label="Observaciones comerciales">
              <textarea className="input" rows={3} disabled={!editable} value={form.obsC} onChange={(e) => actualizarCampo('obsC', e.target.value)} />
            </Field>
            <Field label="Observaciones técnicas">
              <textarea className="input" rows={3} disabled={!editable} value={form.obsT} onChange={(e) => actualizarCampo('obsT', e.target.value)} />
            </Field>
          </Card>

          {editable && (
            <Button onClick={aplicarYVolver} disabled={guardando} style={{ marginBottom: 24 }}>
              {guardando ? 'Aplicando...' : 'Aplicar'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
