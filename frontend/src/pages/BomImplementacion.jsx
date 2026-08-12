import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import AprobacionBanner from '../components/AprobacionBanner.jsx';
import { IconTrash } from '../components/icons.jsx';
import { formatMoney } from '../utils/format.js';
import Field from '../components/Field.jsx';

const money = formatMoney;

function nuevaSede(nombre) {
  return {
    nombre, ingenieros: 1, dias: 1,
    alimentacionDia: 75000, hospedajeDia: 200000, transporteInternoDia: 200000, transporteAeropuerto: 350000,
    vuelo: 0, esLocal: false,
  };
}

export default function BomImplementacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, me } = useAuth();

  const [tecnologias, setTecnologias] = useState([]);
  const [tarifas, setTarifas] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);

  const [modo, setModo] = useState('netmask');
  const [nivelIngenieria, setNivelIngenieria] = useState(2);
  const [esAliado, setEsAliado] = useState(false);
  const [numeroPlantas, setNumeroPlantas] = useState(1);
  const [trm, setTrm] = useState(4000);
  const [requiereAprobacion, setRequiereAprobacion] = useState(false);
  const [sedes, setSedes] = useState([nuevaSede('Sede 1')]);
  const [techState, setTechState] = useState({});
  const [expandidas, setExpandidas] = useState({});
  const [listo, setListo] = useState(false);
  const [estadoGuardado, setEstadoGuardado] = useState('');

  useEffect(() => {
    async function cargar() {
      try {
        const [tecs, trf, sugerencias] = await Promise.all([
          apiFetch('/catalogo-implementacion/tecnologias', { token }),
          apiFetch('/catalogo-implementacion/tarifas', { token }),
          apiFetch(`/boms/${id}/sugerencias-implementacion`, { token }),
        ]);
        setTecnologias(tecs);
        setTarifas(trf);

        const inicial = {};
        sugerencias.forEach((s) => {
          inicial[s.tecnologia_id] = { checked: true, factor: Math.round(Number(s.factor_equipos_sugerido)) || 1 };
        });

        try {
          const existente = await apiFetch(`/boms/${id}/cotizacion-implementacion`, { token });
          setCotizacion(existente);
          setModo(existente.modo);
          setNivelIngenieria(existente.nivel_ingenieria);
          setEsAliado(existente.condicion === 'aliado');
          setNumeroPlantas(Number(existente.numero_plantas));
          setTrm(existente.trm ? Number(existente.trm) : 4000);
          setRequiereAprobacion(!!existente.requiere_aprobacion);
          if (existente.sedes.length) {
            setSedes(existente.sedes.map((s) => ({
              nombre: s.nombre, ingenieros: s.ingenieros, dias: Number(s.dias),
              alimentacionDia: Number(s.alimentacion_dia), hospedajeDia: Number(s.hospedaje_dia),
              transporteInternoDia: Number(s.transporte_interno_dia), transporteAeropuerto: Number(s.transporte_aeropuerto),
              vuelo: Number(s.vuelo), esLocal: s.es_local,
            })));
          }
          existente.tecnologiasSeleccionadas.forEach((t) => {
            inicial[t.tecnologia_id] = { checked: true, factor: Math.round(Number(t.factor_equipos)) || 1 };
          });
          setResultado(existente.resultado);
        } catch {
          // Aun no existe cotizacion para este BOM: se parte de las sugerencias y valores por defecto.
        }

        setTechState(inicial);
      } catch (err) {
        setError(err.message);
      } finally {
        setListo(true);
      }
    }
    cargar();
  }, [id, token]);

  // Recalculo en vivo: cualquier cambio en los campos del wizard dispara un
  // guardado/recalculo automatico (con debounce) en vez de depender de que el
  // usuario recuerde pulsar "Calcular y guardar" -- ver troubleshooting agosto 2026.
  useEffect(() => {
    if (!listo || !editable) return;
    setEstadoGuardado('pendiente');
    const handle = setTimeout(() => { guardarYCalcular(); }, 700);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, modo, nivelIngenieria, esAliado, numeroPlantas, trm, requiereAprobacion, JSON.stringify(sedes), JSON.stringify(techState)]);

  function toggleTech(tecId) {
    setTechState((prev) => ({
      ...prev,
      [tecId]: prev[tecId]?.checked ? { ...prev[tecId], checked: false } : { checked: true, factor: prev[tecId]?.factor || 1 },
    }));
  }
  function setTechFactor(tecId, factor) {
    factor = Math.max(1, Math.round(factor) || 1);
    setTechState((prev) => ({ ...prev, [tecId]: { ...prev[tecId], factor } }));
  }
  function toggleExpandida(tecId) {
    setExpandidas((prev) => ({ ...prev, [tecId]: !prev[tecId] }));
  }

  function actualizarSede(i, campo, valor) {
    setSedes((prev) => prev.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)));
  }
  function agregarSede() {
    setSedes((prev) => [...prev, nuevaSede(`Sede ${prev.length + 1}`)]);
  }
  function quitarSede(i) {
    setSedes((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function guardarYCalcular() {
    setError('');
    setGuardando(true);
    try {
      const tecnologiasSeleccionadas = Object.entries(techState)
        .filter(([, v]) => v.checked && v.factor > 0)
        .map(([tecnologiaId, v]) => ({ tecnologiaId: Number(tecnologiaId), factorEquipos: v.factor }));

      const body = {
        modo,
        nivelIngenieria,
        condicion: esAliado ? 'aliado' : 'interno',
        numeroPlantas,
        trm: modo === 'epsp' ? trm : undefined,
        requiereAprobacion,
        sedes,
        tecnologiasSeleccionadas,
      };
      const res = await apiFetch(`/boms/${id}/cotizacion-implementacion`, { method: 'PUT', token, body });
      setResultado(res.resultado);
      setCotizacion(res);
      setEstadoGuardado('guardado');
      return true;
    } catch (err) {
      setError(err.message);
      setEstadoGuardado('error');
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function aplicarYVolver() {
    const ok = await guardarYCalcular();
    if (ok) navigate(`/boms/${id}`);
  }

  async function ejecutarAccion(accion, comentario) {
    setError('');
    try {
      const res = await apiFetch(`/boms/${id}/cotizacion-implementacion/${accion}`, { method: 'POST', token, body: comentario ? { comentario } : {} });
      setCotizacion(res);
      setResultado(res.resultado);
    } catch (err) {
      setError(err.message);
    }
  }

  // Anidado marca -> grupo -> tecnologias, igual a como se organizan en la
  // Biblioteca de Implementacion -- aqui es solo visualizacion, lo unico
  // editable sigue siendo el checkbox y la cantidad de equipos por tecnologia.
  const marcasTecnologias = tecnologias.reduce((acc, t) => {
    const marca = t.marca_nombre || 'Otras';
    (acc[marca] ||= {});
    (acc[marca][t.grupo_nombre] ||= []).push(t);
    return acc;
  }, {});

  const tarifaActual = tarifas ? tarifas[esAliado ? 'aliado' : 'interno'][nivelIngenieria] : null;
  const editable = !cotizacion || !cotizacion.requiere_aprobacion || ['borrador', 'rechazado'].includes(cotizacion.estado);
  const rol = me?.rol;

  return (
    <div className="content">
      <PageHeader back={`/boms/${id}`} title="Implementación" subtitle="Dimensiona horas, viáticos y tecnologías del proyecto." />
      {error && <div className="alert alert-danger">{error}</div>}

      {cotizacion?.requiere_aprobacion && (
        <AprobacionBanner estado={cotizacion.estado} historial={cotizacion.historial} rol={rol} onAccion={ejecutarAccion} />
      )}

      <Card title="Proyecto" style={{ marginBottom: 16 }}>
        <Field label="Modo">
          <select className="input" disabled={!editable} value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="netmask">Servicio Netmask (COP)</option>
            <option value="epsp">Servicio EPSP (días EPSP, TD Synnex/Fortinet)</option>
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Nivel de ingeniería">
            <select className="input" disabled={!editable} value={nivelIngenieria} onChange={(e) => setNivelIngenieria(Number(e.target.value))}>
              <option value={1}>Nivel I</option>
              <option value={2}>Nivel II</option>
              <option value={3}>Nivel III</option>
            </select>
          </Field>
          <Field label="Número de plantas/sedes">
            <input className="input" type="number" min="1" step="1" disabled={!editable} value={numeroPlantas}
              onChange={(e) => setNumeroPlantas(Math.max(1, Math.round(Number(e.target.value)) || 1))} />
          </Field>
        </div>
        <label className="checkbox-row" style={{ marginBottom: 10 }}>
          <input type="checkbox" disabled={!editable} checked={esAliado} onChange={(e) => setEsAliado(e.target.checked)} /> Es aliado
          {tarifaActual && <span className="muted">· Tarifa: ${money(tarifaActual)} COP/hora</span>}
        </label>
        {modo === 'epsp' && (
          <Field label="TRM (COP/USD)">
            <input className="input" type="number" min="1" step="1" disabled={!editable} value={trm}
              onChange={(e) => setTrm(Math.max(1, Math.round(Number(e.target.value)) || 1))} style={{ maxWidth: 200 }} />
          </Field>
        )}
        <label className="checkbox-row">
          <input type="checkbox" disabled={!editable} checked={requiereAprobacion} onChange={(e) => setRequiereAprobacion(e.target.checked)} />
          Este proyecto requiere aprobación (implementación de gran tamaño)
        </label>
        <p className="text-sm muted" style={{ marginTop: 4 }}>
          Criterio a juicio del preventa según el cliente/proyecto — no hay un umbral automático de horas o costo.
        </p>
      </Card>

      <Card title="Viáticos por sede" style={{ marginBottom: 16 }}>
        {sedes.map((s, i) => (
          <div key={i} style={{ borderBottom: i < sedes.length - 1 ? '1px solid var(--nm-border)' : 'none', paddingBottom: 14, marginBottom: 14 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <input value={s.nombre} disabled={!editable} onChange={(e) => actualizarSede(i, 'nombre', e.target.value)}
                style={{ fontWeight: 700, border: 'none', fontSize: 14, background: 'transparent', color: 'var(--nm-navy)' }} />
              {editable && sedes.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => quitarSede(i)} style={{ color: 'var(--nm-danger)' }}>
                  <IconTrash width={14} height={14} /> Quitar
                </Button>
              )}
            </div>
            <label className="checkbox-row" style={{ marginBottom: 10 }}>
              <input type="checkbox" disabled={!editable} checked={s.esLocal} onChange={(e) => actualizarSede(i, 'esLocal', e.target.checked)} /> Sede local (sin viáticos de viaje)
            </label>
            <div className="form-grid-3">
              <Field label="Ingenieros"><input className="input" type="number" min="1" step="1" disabled={!editable} value={s.ingenieros} onChange={(e) => actualizarSede(i, 'ingenieros', Math.max(1, Math.round(Number(e.target.value)) || 1))} /></Field>
              <Field label="Días en sitio"><input className="input" type="number" min="0" step="1" disabled={!editable} value={s.dias} onChange={(e) => actualizarSede(i, 'dias', Math.max(0, Math.round(Number(e.target.value)) || 0))} /></Field>
              <Field label="Vuelo (COP)"><input className="input" type="number" min="0" disabled={!editable} value={s.vuelo} onChange={(e) => actualizarSede(i, 'vuelo', Number(e.target.value))} /></Field>
              <Field label="Transp. aeropuerto"><input className="input" type="number" min="0" disabled={!editable} value={s.transporteAeropuerto} onChange={(e) => actualizarSede(i, 'transporteAeropuerto', Number(e.target.value))} /></Field>
              <Field label="Alimentación/día"><input className="input" type="number" min="0" disabled={!editable} value={s.alimentacionDia} onChange={(e) => actualizarSede(i, 'alimentacionDia', Number(e.target.value))} /></Field>
              <Field label="Hospedaje/día"><input className="input" type="number" min="0" disabled={!editable} value={s.hospedajeDia} onChange={(e) => actualizarSede(i, 'hospedajeDia', Number(e.target.value))} /></Field>
              <Field label="Transp. interno/día"><input className="input" type="number" min="0" disabled={!editable} value={s.transporteInternoDia} onChange={(e) => actualizarSede(i, 'transporteInternoDia', Number(e.target.value))} /></Field>
            </div>
          </div>
        ))}
        {editable && <Button variant="outline" size="sm" onClick={agregarSede}>+ Agregar sede</Button>}
      </Card>

      <Card title="Tecnologías" subtitle="Bolsa de Horas y Site Survey ahora se configuran desde Servicios Netmask." style={{ marginBottom: 16 }}>
        {Object.entries(marcasTecnologias).map(([marca, grupos]) => (
          <details key={marca} open style={{ marginBottom: 14 }}>
            <summary style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer', padding: '4px 0', color: 'var(--nm-navy)' }}>{marca}</summary>
            <div style={{ paddingLeft: 12 }}>
              {Object.entries(grupos).map(([grupo, techs]) => (
                <div key={grupo} style={{ marginBottom: 14 }}>
                  <div className="sidebar-section-label" style={{ color: 'var(--nm-text-muted)', padding: '0 0 6px' }}>{grupo}</div>
                  {techs.map((t) => {
                    const st = techState[t.id];
                    const abierta = !!expandidas[t.id];
                    return (
                      <div key={t.id} style={{ padding: '5px 0' }}>
                        <div className="row">
                          <input type="checkbox" disabled={!editable} checked={!!st?.checked} onChange={() => toggleTech(t.id)} />
                          <span style={{ flex: 1, fontSize: 13.5 }}>{t.nombre}</span>
                          {st?.checked && (
                            <input className="input" type="number" min="1" step="1" disabled={!editable} value={st.factor}
                              onChange={(e) => setTechFactor(t.id, Number(e.target.value))}
                              title="Cantidad de equipos" style={{ width: 76 }} />
                          )}
                          <button type="button" onClick={() => toggleExpandida(t.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--nm-blue)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>
                            {abierta ? '▾ ocultar' : '▸ ver actividades'}
                          </button>
                        </div>
                        {abierta && (
                          <div className="table-wrap" style={{ marginTop: 6, marginBottom: 6 }}>
                            <table className="nm-table">
                              <thead><tr><th>Actividad</th><th>Horas</th><th>Modalidad</th></tr></thead>
                              <tbody>
                                {(t.actividades || []).map((a) => (
                                  <tr key={a.id}>
                                    <td className="text-sm">{a.texto}</td>
                                    <td className="text-sm">{a.horas}</td>
                                    <td className="text-sm muted">{a.modo === 'en_sitio' ? 'En sitio' : 'Remota'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </details>
        ))}
      </Card>

      {editable && (
        <div className="row" style={{ marginBottom: 24, alignItems: 'center' }}>
          <Button onClick={guardarYCalcular} disabled={guardando} variant="outline">
            {guardando ? 'Calculando...' : 'Recalcular ahora'}
          </Button>
          <span className="text-sm muted">
            {guardando ? 'Calculando...'
              : estadoGuardado === 'pendiente' ? 'Cambios sin guardar — recalculando en unos segundos...'
              : estadoGuardado === 'error' ? 'No se pudo guardar el último cambio'
              : estadoGuardado === 'guardado' ? 'Cálculo actualizado automáticamente'
              : ''}
          </span>
        </div>
      )}

      {resultado && (
        <Card title="Resultado">
          <div className="row" style={{ gap: 32, marginBottom: 20 }}>
            <div>
              <div className="text-sm muted">Horas (con PM)</div>
              <strong style={{ fontSize: 18 }}>{Number(resultado.total_horas).toFixed(1)} h</strong>
            </div>
            {modo === 'epsp' ? (
              <div>
                <div className="text-sm muted">Total días EPSP</div>
                <strong style={{ fontSize: 18, color: 'var(--nm-blue-dark)' }}>{Number(resultado.total_dias_epsp).toFixed(2)}</strong>
              </div>
            ) : (
              <div>
                <div className="text-sm muted">Total Netmask</div>
                <strong style={{ fontSize: 18, color: 'var(--nm-blue-dark)' }}>${money(resultado.total_cop)} COP</strong>
              </div>
            )}
            <div>
              <div className="text-sm muted">Viáticos</div>
              <strong style={{ fontSize: 18 }}>${money(resultado.viaticos_cop)} COP{resultado.viaticos_usd ? ` (${money(resultado.viaticos_usd)} USD)` : ''}</strong>
            </div>
          </div>
          <div className="table-wrap">
            <table className="nm-table">
              <thead>
                <tr><th>Bloque / Actividad</th><th>Cant.</th><th>Horas</th><th>Modalidad</th></tr>
              </thead>
              {resultado.detalle_calculo.blocks.map((b, bi) => (
                <tbody key={bi}>
                  <tr style={{ background: 'var(--nm-bg)' }}>
                    <td colSpan={4} style={{ fontWeight: 700 }}>{b.titulo} — {b.subtotalHoras.toFixed(1)} h</td>
                  </tr>
                  {b.items.map((it, ii) => (
                    <tr key={ii}>
                      <td>{it.texto}{it.unitario ? ' (único por proyecto)' : ''}</td>
                      <td>{it.cantidad}</td>
                      <td>{it.horas}</td>
                      <td className="muted">{it.modo === 'en_sitio' ? 'En sitio' : 'Remota'}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </Card>
      )}

      {editable && (
        <Button onClick={aplicarYVolver} disabled={guardando} style={{ marginTop: 20 }}>
          {guardando ? 'Aplicando...' : 'Aplicar'}
        </Button>
      )}
    </div>
  );
}
