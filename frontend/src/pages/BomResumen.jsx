import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch, apiDownload } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Button from '../components/Button.jsx';
import Badge from '../components/Badge.jsx';
import Card from '../components/Card.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { IconBox, IconWrench, IconShield, IconDownload, IconLibrary } from '../components/icons.jsx';

const money = (n) => Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

const TIPOS_DOCUMENTO = {
  excel_cotizacion: 'Excel — Cotización de Implementación',
  word_especificacion: 'Word — Especificación de Servicio',
  excel_bom: 'Excel — BOM consolidado',
  word_propuesta_tecnica: 'Word — Propuesta Técnica',
};

const ESTADO_ESPEC_BADGE = {
  borrador: 'neutral', revision_lider: 'warning', aprobado_lider: 'info',
  revision_gerencia: 'warning', aprobado: 'success', generado: 'success', rechazado: 'danger',
};
const ESTADO_ESPEC_LABEL = {
  borrador: 'Borrador', revision_lider: 'En revisión (Líder)', aprobado_lider: 'Aprobado (Líder)',
  revision_gerencia: 'En revisión (Gerencia)', aprobado: 'Aprobado', generado: 'Generado', rechazado: 'Rechazado',
};

function ComponentCard({ icon: Icon, title, description, included, status, to, resumen }) {
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'var(--nm-blue-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-blue-dark)', flexShrink: 0,
        }}>
          <Icon width={18} height={18} />
        </div>
        <h3 className="card-title" style={{ marginBottom: 0 }}>{title}</h3>
      </div>
      <p className="text-sm muted" style={{ minHeight: 38 }}>{description}</p>
      <div style={{ marginBottom: 14 }}>
        <Badge variant={included ? 'success' : 'neutral'}>{status}</Badge>
      </div>
      {included && resumen && (
        <details style={{ marginBottom: 14 }}>
          <summary style={{ fontSize: 13, color: 'var(--nm-blue)', cursor: 'pointer' }}>Ver resumen</summary>
          <div style={{ marginTop: 8 }}>{resumen}</div>
        </details>
      )}
      <Link to={to}>
        <Button block variant={included ? 'outline' : 'primary'}>{included ? 'Editar' : 'Configurar'}</Button>
      </Link>
    </div>
  );
}

function horasPorTecnologiaDesdeBlocks(cotizacion) {
  const mapa = {};
  (cotizacion?.resultado?.detalle_calculo?.blocks || []).forEach((b) => {
    const m = /^IMPLEMENTACION - (.+)$/.exec(b.titulo);
    if (m) mapa[m[1]] = b.subtotalHoras;
  });
  return mapa;
}

export default function BomResumen() {
  const { id } = useParams();
  const { token } = useAuth();
  const [bom, setBom] = useState(null);
  const [hardwareItems, setHardwareItems] = useState([]);
  const [cotizacion, setCotizacion] = useState(null);
  const [especificacion, setEspecificacion] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [generando, setGenerando] = useState('');
  const [error, setError] = useState('');
  const [notas, setNotas] = useState('');
  const [guardandoNotas, setGuardandoNotas] = useState(false);
  const [tarifas, setTarifas] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [comerciales, setComerciales] = useState([]);
  const [editandoDetalles, setEditandoDetalles] = useState(false);
  const [detalles, setDetalles] = useState({ nombre: '', clienteId: '', comercialId: '', ubicacionProyecto: '', idOportunidad: '' });
  const [guardandoDetalles, setGuardandoDetalles] = useState(false);

  function cargarBom() {
    return apiFetch(`/boms/${id}`, { token }).then((b) => { setBom(b); setNotas(b.notas || ''); return b; });
  }

  function cargarDocumentos() {
    apiFetch(`/boms/${id}/documentos`, { token }).then(setDocumentos).catch(() => {});
  }

  useEffect(() => {
    cargarBom().catch((err) => setError(err.message));
    apiFetch(`/boms/${id}/hardware-items`, { token }).then(setHardwareItems).catch(() => {});
    apiFetch(`/boms/${id}/cotizacion-implementacion`, { token }).then(setCotizacion).catch(() => {});
    apiFetch(`/boms/${id}/especificacion`, { token }).then(setEspecificacion).catch(() => {});
    apiFetch('/catalogo-implementacion/tarifas', { token }).then(setTarifas).catch(() => {});
    apiFetch('/clientes', { token }).then(setClientes).catch(() => {});
    apiFetch('/comerciales', { token }).then(setComerciales).catch(() => {});
    cargarDocumentos();
  }, [id, token]);

  async function guardarNotas() {
    setGuardandoNotas(true);
    setError('');
    try {
      await apiFetch(`/boms/${id}`, { method: 'PUT', token, body: { notas } });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoNotas(false);
    }
  }

  function empezarEdicionDetalles() {
    setDetalles({
      nombre: bom.nombre,
      clienteId: String(bom.cliente_id),
      comercialId: bom.comercial_id ? String(bom.comercial_id) : '',
      ubicacionProyecto: bom.ubicacion_proyecto || '',
      idOportunidad: bom.id_oportunidad || '',
    });
    setEditandoDetalles(true);
  }

  async function guardarDetalles() {
    setError('');
    const idOportunidadTrim = detalles.idOportunidad.trim();
    if (idOportunidadTrim && !/^OP-\d+$/.test(idOportunidadTrim)) {
      setError('El ID de oportunidad debe tener el formato OP-#### (ej. OP-5309)');
      return;
    }
    setGuardandoDetalles(true);
    try {
      await apiFetch(`/boms/${id}`, {
        method: 'PUT',
        token,
        body: {
          nombre: detalles.nombre,
          clienteId: Number(detalles.clienteId),
          comercialId: Number(detalles.comercialId),
          ubicacionProyecto: detalles.ubicacionProyecto,
          idOportunidad: idOportunidadTrim,
        },
      });
      await cargarBom();
      setEditandoDetalles(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoDetalles(false);
    }
  }

  async function generar(accion) {
    setError('');
    setGenerando(accion);
    try {
      const doc = await apiFetch(`/boms/${id}/documentos/${accion}`, { method: 'POST', token });
      await apiDownload(`/documentos/${doc.id}/descargar`, token);
      cargarDocumentos();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerando('');
    }
  }

  if (error && !bom) return <div className="content"><div className="alert alert-danger">{error}</div></div>;
  if (!bom) return <div className="content spinner-wrap">Cargando...</div>;

  const totalHardware = hardwareItems.reduce((acc, it) => acc + Number(it.subtotal), 0);
  const hayAlgunComponente = !!cotizacion || !!especificacion || hardwareItems.length > 0;

  const resumenHardware = hardwareItems.length > 0 && (
    <div className="table-wrap">
      <table className="nm-table">
        <thead><tr><th>Nombre</th><th>Marca</th><th>Cantidad</th><th>Precio unit.</th></tr></thead>
        <tbody>
          {hardwareItems.map((it) => (
            <tr key={it.id}>
              <td>{it.nombre}</td>
              <td className="muted">{it.marca || '—'}</td>
              <td>{it.cantidad}</td>
              <td>${money(it.precio_unitario_snapshot)} {it.moneda || 'COP'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tarifaActual = tarifas && cotizacion ? tarifas[cotizacion.condicion]?.[cotizacion.nivel_ingenieria] : null;
  const horasPorTecnologia = horasPorTecnologiaDesdeBlocks(cotizacion);
  const resumenImplementacion = cotizacion?.tecnologiasSeleccionadas?.length > 0 && (
    <div className="table-wrap">
      <table className="nm-table">
        <thead><tr><th>Tecnología</th><th>Marca</th><th>Cantidad</th><th>{cotizacion.modo === 'netmask' ? 'Costo' : 'Horas'}</th></tr></thead>
        <tbody>
          {cotizacion.tecnologiasSeleccionadas.map((t) => {
            const horas = horasPorTecnologia[t.tecnologia_nombre] || 0;
            return (
              <tr key={t.tecnologia_id}>
                <td>{t.tecnologia_nombre}</td>
                <td className="muted">{t.marca_nombre}</td>
                <td>{t.factor_equipos}</td>
                <td>{cotizacion.modo === 'netmask' && tarifaActual ? `$${money(horas * tarifaActual)} COP` : `${horas.toFixed(1)} h`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const dwServicios = especificacion?.datos_wizard || {};
  const resumenServicios = especificacion && (
    <div className="table-wrap">
      <table className="nm-table">
        <tbody>
          <tr><td style={{ fontWeight: 600 }}>Tipo de servicio</td><td>{especificacion.tipo_servicio_nombre}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Modalidad</td><td>{dwServicios.modalidad || '—'}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Cobertura</td><td>{dwServicios.cobertura || '—'}</td></tr>
          <tr><td style={{ fontWeight: 600 }}>Vigencia</td><td>{dwServicios.vigencia ? `${dwServicios.vigencia} meses` : '—'}</td></tr>
        </tbody>
      </table>
    </div>
  );

  const comercialesOT = comerciales.filter((c) => c.sector === 'OT');
  const comercialesIT = comerciales.filter((c) => c.sector === 'IT');
  const comercialesMixto = comerciales.filter((c) => c.sector === 'IT/OT');

  return (
    <div className="content">
      <PageHeader
        back="/"
        title={bom.nombre}
        subtitle={`Creado por ${bom.creador_nombre}`}
        actions={<Badge variant="info">{bom.estado}</Badge>}
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <Card
        title="Detalles del proyecto"
        actions={!editandoDetalles && <Button size="sm" variant="outline" onClick={empezarEdicionDetalles}>Editar</Button>}
        style={{ marginBottom: 20 }}
      >
        {editandoDetalles ? (
          <>
            <div className="field">
              <label>Nombre del proyecto</label>
              <input className="input" value={detalles.nombre} onChange={(e) => setDetalles({ ...detalles, nombre: e.target.value })} />
            </div>
            <div className="field">
              <label>Cliente</label>
              <select className="input" value={detalles.clienteId} onChange={(e) => setDetalles({ ...detalles, clienteId: e.target.value })}>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre_cliente}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Comercial asociado</label>
              <select className="input" value={detalles.comercialId} onChange={(e) => setDetalles({ ...detalles, comercialId: e.target.value })}>
                <option value="">-- Selecciona --</option>
                {comercialesOT.length > 0 && (
                  <optgroup label="OT">
                    {comercialesOT.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </optgroup>
                )}
                {comercialesIT.length > 0 && (
                  <optgroup label="IT">
                    {comercialesIT.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </optgroup>
                )}
                {comercialesMixto.length > 0 && (
                  <optgroup label="IT/OT">
                    {comercialesMixto.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="field">
              <label>Ubicación del proyecto</label>
              <input className="input" value={detalles.ubicacionProyecto} onChange={(e) => setDetalles({ ...detalles, ubicacionProyecto: e.target.value })} />
            </div>
            <div className="field">
              <label>ID de la oportunidad <span className="muted">(opcional)</span></label>
              <input className="input" value={detalles.idOportunidad} onChange={(e) => setDetalles({ ...detalles, idOportunidad: e.target.value })} placeholder="Ej. OP-5309" />
            </div>
            <div className="row">
              <Button size="sm" onClick={guardarDetalles} disabled={guardandoDetalles}>{guardandoDetalles ? 'Guardando...' : 'Guardar'}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditandoDetalles(false)} disabled={guardandoDetalles}>Cancelar</Button>
            </div>
          </>
        ) : (
          <div className="table-wrap">
            <table className="nm-table">
              <tbody>
                <tr><td style={{ fontWeight: 600 }}>Cliente</td><td>{bom.cliente_nombre}</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Comercial</td><td>{bom.comercial_nombre || '—'}</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Ubicación</td><td>{bom.ubicacion_proyecto || '—'}</td></tr>
                <tr><td style={{ fontWeight: 600 }}>ID de oportunidad</td><td>{bom.id_oportunidad || '—'}</td></tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="stack" style={{ marginBottom: 24 }}>
        <ComponentCard
          icon={IconBox} title="Hardware" to={`/boms/${id}/hardware`}
          description="Cantidad, precio y SKU de los equipos del proyecto."
          included={hardwareItems.length > 0}
          status={hardwareItems.length > 0 ? `${hardwareItems.length} ítem(s) · $${money(totalHardware)} COP` : 'No incluido'}
          resumen={resumenHardware}
        />
        <ComponentCard
          icon={IconWrench} title="Implementación" to={`/boms/${id}/implementacion`}
          description="Horas, viáticos y costo de la implementación técnica."
          included={!!cotizacion?.resultado}
          status={cotizacion?.resultado
            ? (cotizacion.requiere_aprobacion
              ? (ESTADO_ESPEC_LABEL[cotizacion.estado] || cotizacion.estado)
              : (cotizacion.modo === 'epsp' ? `${Number(cotizacion.resultado.total_dias_epsp).toFixed(2)} días EPSP` : `$${money(cotizacion.resultado.total_cop)} COP`))
            : 'No incluido'}
          resumen={resumenImplementacion}
        />
        <ComponentCard
          icon={IconShield} title="Servicios Netmask" to={`/boms/${id}/servicios`}
          description="SLA, cobertura y alcance del servicio gestionado."
          included={!!especificacion}
          status={especificacion ? especificacion.estado : 'No incluido'}
          resumen={resumenServicios}
        />
      </div>

      <Card title="Comentarios" subtitle="Notas libres que se incluyen en el Excel BOM consolidado." style={{ marginBottom: 20 }}>
        <textarea className="input" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. supuestos, aclaraciones para el comercial, condiciones especiales..." />
        <Button size="sm" variant="outline" onClick={guardarNotas} disabled={guardandoNotas} style={{ marginTop: 8 }}>
          {guardandoNotas ? 'Guardando...' : 'Guardar comentarios'}
        </Button>
      </Card>

      <Card title="Generar documentos" subtitle="Exporta los documentos individuales o el consolidado del proyecto.">
        <div className="row" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
          <Button variant="outline" size="sm" disabled={!cotizacion || !!generando} onClick={() => generar('generar-excel-cotizacion')}>
            {generando === 'generar-excel-cotizacion' ? 'Generando...' : 'Excel — Cotización'}
          </Button>
          <Button variant="outline" size="sm" disabled={!especificacion || !!generando} onClick={() => generar('generar-word-especificacion')}>
            {generando === 'generar-word-especificacion' ? 'Generando...' : 'Word — Especificación'}
          </Button>
          <Button size="sm" disabled={!hayAlgunComponente || !!generando} onClick={() => generar('generar-excel-bom')}>
            {generando === 'generar-excel-bom' ? 'Generando...' : 'Generar BOM (Excel)'}
          </Button>
          <Button size="sm" disabled={!hayAlgunComponente || !!generando} onClick={() => generar('generar-propuesta-tecnica')}>
            {generando === 'generar-propuesta-tecnica' ? 'Generando...' : 'Generar Propuesta Técnica (Word)'}
          </Button>
        </div>

        <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--nm-text-muted)', marginBottom: 10 }}>
          Documentos generados
        </h4>
        {documentos.length === 0 ? (
          <EmptyState icon={IconLibrary} description="Aún no se ha generado ningún documento." />
        ) : (
          <div className="table-wrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Archivo</th>
                  <th>Generado por</th>
                  <th>Fecha</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => (
                  <tr key={d.id}>
                    <td>{TIPOS_DOCUMENTO[d.tipo] || d.tipo}</td>
                    <td className="muted">{d.nombre_archivo}</td>
                    <td>{d.generado_por_nombre}</td>
                    <td className="muted">{new Date(d.generado_en).toLocaleString('es-CO')}</td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => apiDownload(`/documentos/${d.id}/descargar`, token)}>
                        <IconDownload width={15} height={15} /> Descargar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
