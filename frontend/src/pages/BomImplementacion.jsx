import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import { IconTrash } from '../components/icons.jsx';

const money = (n) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

function nuevaSede(nombre) {
  return {
    nombre, ingenieros: 1, dias: 1,
    alimentacionDia: 75000, hospedajeDia: 200000, transporteInternoDia: 200000, transporteAeropuerto: 350000,
    vuelo: 0, esLocal: false,
  };
}

export default function BomImplementacion() {
  const { id } = useParams();
  const { token } = useAuth();

  const [tecnologias, setTecnologias] = useState([]);
  const [rangos, setRangos] = useState([]);
  const [tarifas, setTarifas] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const [modo, setModo] = useState('netmask');
  const [nivelIngenieria, setNivelIngenieria] = useState(2);
  const [esAliado, setEsAliado] = useState(false);
  const [numeroPlantas, setNumeroPlantas] = useState(1);
  const [trm, setTrm] = useState(4000);
  const [bolsaHorasActiva, setBolsaHorasActiva] = useState(false);
  const [siteSurveyActivo, setSiteSurveyActivo] = useState(false);
  const [sedes, setSedes] = useState([nuevaSede('Sede 1')]);
  const [siteSurveySedes, setSiteSurveySedes] = useState([]);
  const [techState, setTechState] = useState({});

  useEffect(() => {
    async function cargar() {
      try {
        const [tecs, rgs, trf, sugerencias] = await Promise.all([
          apiFetch('/catalogo-implementacion/tecnologias', { token }),
          apiFetch('/catalogo-implementacion/site-survey-rangos', { token }),
          apiFetch('/catalogo-implementacion/tarifas', { token }),
          apiFetch(`/boms/${id}/sugerencias-implementacion`, { token }),
        ]);
        setTecnologias(tecs);
        setRangos(rgs);
        setTarifas(trf);

        const inicial = {};
        sugerencias.forEach((s) => {
          inicial[s.tecnologia_id] = { checked: true, factor: Number(s.factor_equipos_sugerido) };
        });

        try {
          const existente = await apiFetch(`/boms/${id}/cotizacion-implementacion`, { token });
          setModo(existente.modo);
          setNivelIngenieria(existente.nivel_ingenieria);
          setEsAliado(existente.condicion === 'aliado');
          setNumeroPlantas(Number(existente.numero_plantas));
          setTrm(existente.trm ? Number(existente.trm) : 4000);
          setBolsaHorasActiva(existente.bolsa_horas_activa);
          setSiteSurveyActivo(existente.site_survey_activo);
          if (existente.sedes.length) {
            setSedes(existente.sedes.map((s) => ({
              nombre: s.nombre, ingenieros: s.ingenieros, dias: Number(s.dias),
              alimentacionDia: Number(s.alimentacion_dia), hospedajeDia: Number(s.hospedaje_dia),
              transporteInternoDia: Number(s.transporte_interno_dia), transporteAeropuerto: Number(s.transporte_aeropuerto),
              vuelo: Number(s.vuelo), esLocal: s.es_local,
            })));
          }
          setSiteSurveySedes(existente.siteSurveySedes.map((s) => ({ nombreSede: s.nombre_sede, rangoId: s.rango_id })));
          existente.tecnologiasSeleccionadas.forEach((t) => {
            inicial[t.tecnologia_id] = { checked: true, factor: Number(t.factor_equipos) };
          });
          setResultado(existente.resultado);
        } catch {
          // Aun no existe cotizacion para este BOM: se parte de las sugerencias y valores por defecto.
        }

        setTechState(inicial);
      } catch (err) {
        setError(err.message);
      }
    }
    cargar();
  }, [id, token]);

  function toggleTech(tecId) {
    setTechState((prev) => ({
      ...prev,
      [tecId]: prev[tecId]?.checked ? { ...prev[tecId], checked: false } : { checked: true, factor: prev[tecId]?.factor || 1 },
    }));
  }
  function setTechFactor(tecId, factor) {
    setTechState((prev) => ({ ...prev, [tecId]: { ...prev[tecId], factor } }));
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

  function agregarSiteSurveySede() {
    setSiteSurveySedes((prev) => [...prev, { nombreSede: `Sede ${prev.length + 1}`, rangoId: rangos[0]?.id }]);
  }
  function actualizarSiteSurveySede(i, campo, valor) {
    setSiteSurveySedes((prev) => prev.map((s, idx) => (idx === i ? { ...s, [campo]: valor } : s)));
  }
  function quitarSiteSurveySede(i) {
    setSiteSurveySedes((prev) => prev.filter((_, idx) => idx !== i));
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
        bolsaHorasActiva,
        siteSurveyActivo: modo === 'netmask' ? siteSurveyActivo : false,
        sedes,
        tecnologiasSeleccionadas,
        siteSurveySedes: modo === 'netmask' && siteSurveyActivo ? siteSurveySedes : [],
      };
      const res = await apiFetch(`/boms/${id}/cotizacion-implementacion`, { method: 'PUT', token, body });
      setResultado(res.resultado);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  const gruposTecnologias = tecnologias.reduce((acc, t) => {
    (acc[t.grupo_nombre] ||= []).push(t);
    return acc;
  }, {});

  const tarifaActual = tarifas ? tarifas[esAliado ? 'aliado' : 'interno'][nivelIngenieria] : null;

  return (
    <div className="content">
      <PageHeader back={`/boms/${id}`} title="Implementación" subtitle="Dimensiona horas, viáticos y tecnologías del proyecto." />
      {error && <div className="alert alert-danger">{error}</div>}

      <Card title="Proyecto" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Modo</label>
          <select className="input" value={modo} onChange={(e) => setModo(e.target.value)}>
            <option value="netmask">Servicio Netmask (COP)</option>
            <option value="epsp">Servicio EPSP (días EPSP, TD Synnex/Fortinet)</option>
          </select>
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Nivel de ingeniería</label>
            <select className="input" value={nivelIngenieria} onChange={(e) => setNivelIngenieria(Number(e.target.value))}>
              <option value={1}>Nivel I</option>
              <option value={2}>Nivel II</option>
              <option value={3}>Nivel III</option>
            </select>
          </div>
          <div className="field">
            <label>Número de plantas/sedes</label>
            <input className="input" type="number" min="1" value={numeroPlantas} onChange={(e) => setNumeroPlantas(Number(e.target.value))} />
          </div>
        </div>
        <label className="checkbox-row" style={{ marginBottom: 10 }}>
          <input type="checkbox" checked={esAliado} onChange={(e) => setEsAliado(e.target.checked)} /> Es aliado
          {tarifaActual && <span className="muted">· Tarifa: ${money(tarifaActual)} COP/hora</span>}
        </label>
        {modo === 'epsp' && (
          <div className="field">
            <label>TRM (COP/USD)</label>
            <input className="input" type="number" min="1" value={trm} onChange={(e) => setTrm(Number(e.target.value))} style={{ maxWidth: 200 }} />
          </div>
        )}
        <label className="checkbox-row" style={{ marginBottom: 8 }}>
          <input type="checkbox" checked={bolsaHorasActiva} onChange={(e) => setBolsaHorasActiva(e.target.checked)} />
          Bolsa de horas (cobro por jornada en sitio, sin desglose de actividades)
        </label>
        {modo === 'netmask' && (
          <label className="checkbox-row">
            <input type="checkbox" checked={siteSurveyActivo} onChange={(e) => setSiteSurveyActivo(e.target.checked)} />
            Incluir Site Survey (Ekahau)
          </label>
        )}
      </Card>

      <Card title="Viáticos por sede" style={{ marginBottom: 16 }}>
        {sedes.map((s, i) => (
          <div key={i} style={{ borderBottom: i < sedes.length - 1 ? '1px solid var(--nm-border)' : 'none', paddingBottom: 14, marginBottom: 14 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <input value={s.nombre} onChange={(e) => actualizarSede(i, 'nombre', e.target.value)}
                style={{ fontWeight: 700, border: 'none', fontSize: 14, background: 'transparent', color: 'var(--nm-navy)' }} />
              {sedes.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => quitarSede(i)} style={{ color: 'var(--nm-danger)' }}>
                  <IconTrash width={14} height={14} /> Quitar
                </Button>
              )}
            </div>
            <label className="checkbox-row" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={s.esLocal} onChange={(e) => actualizarSede(i, 'esLocal', e.target.checked)} /> Sede local (sin viáticos de viaje)
            </label>
            <div className="form-grid-3">
              <div className="field"><label>Ingenieros</label><input className="input" type="number" min="1" value={s.ingenieros} onChange={(e) => actualizarSede(i, 'ingenieros', Number(e.target.value))} /></div>
              <div className="field"><label>Días en sitio</label><input className="input" type="number" min="0" value={s.dias} onChange={(e) => actualizarSede(i, 'dias', Number(e.target.value))} /></div>
              <div className="field"><label>Vuelo (COP)</label><input className="input" type="number" min="0" value={s.vuelo} onChange={(e) => actualizarSede(i, 'vuelo', Number(e.target.value))} /></div>
              <div className="field"><label>Transp. aeropuerto</label><input className="input" type="number" min="0" value={s.transporteAeropuerto} onChange={(e) => actualizarSede(i, 'transporteAeropuerto', Number(e.target.value))} /></div>
              <div className="field"><label>Alimentación/día</label><input className="input" type="number" min="0" value={s.alimentacionDia} onChange={(e) => actualizarSede(i, 'alimentacionDia', Number(e.target.value))} /></div>
              <div className="field"><label>Hospedaje/día</label><input className="input" type="number" min="0" value={s.hospedajeDia} onChange={(e) => actualizarSede(i, 'hospedajeDia', Number(e.target.value))} /></div>
              <div className="field"><label>Transp. interno/día</label><input className="input" type="number" min="0" value={s.transporteInternoDia} onChange={(e) => actualizarSede(i, 'transporteInternoDia', Number(e.target.value))} /></div>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={agregarSede}>+ Agregar sede</Button>
      </Card>

      {modo === 'netmask' && siteSurveyActivo && (
        <Card title="Site Survey (Ekahau)" style={{ marginBottom: 16 }}>
          {siteSurveySedes.map((s, i) => (
            <div key={i} className="row" style={{ marginBottom: 8 }}>
              <input className="input" value={s.nombreSede} onChange={(e) => actualizarSiteSurveySede(i, 'nombreSede', e.target.value)} style={{ flex: 1 }} />
              <select className="input" value={s.rangoId} onChange={(e) => actualizarSiteSurveySede(i, 'rangoId', Number(e.target.value))} style={{ flex: 1 }}>
                {rangos.map((r) => <option key={r.id} value={r.id}>{r.etiqueta}</option>)}
              </select>
              <Button variant="ghost" size="sm" onClick={() => quitarSiteSurveySede(i)} style={{ color: 'var(--nm-danger)' }}><IconTrash width={14} height={14} /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={agregarSiteSurveySede}>+ Agregar sede de Site Survey</Button>
        </Card>
      )}

      <Card title="Tecnologías" style={{ marginBottom: 16 }}>
        {Object.entries(gruposTecnologias).map(([grupo, techs]) => (
          <div key={grupo} style={{ marginBottom: 14 }}>
            <div className="sidebar-section-label" style={{ color: 'var(--nm-text-muted)', padding: '0 0 6px' }}>{grupo}</div>
            {techs.map((t) => {
              const st = techState[t.id];
              return (
                <div key={t.id} className="row" style={{ padding: '5px 0' }}>
                  <input type="checkbox" checked={!!st?.checked} onChange={() => toggleTech(t.id)} />
                  <span style={{ flex: 1, fontSize: 13.5 }}>{t.nombre}</span>
                  {st?.checked && (
                    <input className="input" type="number" min="0" step="0.5" value={st.factor} onChange={(e) => setTechFactor(t.id, Number(e.target.value))}
                      title="Cantidad de equipos" style={{ width: 76 }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </Card>

      <Button onClick={guardarYCalcular} disabled={guardando} style={{ marginBottom: 24 }}>
        {guardando ? 'Calculando...' : 'Calcular y guardar'}
      </Button>

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
    </div>
  );
}
