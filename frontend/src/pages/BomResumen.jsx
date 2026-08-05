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

function ComponentCard({ icon: Icon, title, description, included, status, to }) {
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
      <Link to={to}>
        <Button block variant={included ? 'outline' : 'primary'}>{included ? 'Ver / editar' : 'Configurar'}</Button>
      </Link>
    </div>
  );
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

  function cargarDocumentos() {
    apiFetch(`/boms/${id}/documentos`, { token }).then(setDocumentos).catch(() => {});
  }

  useEffect(() => {
    apiFetch(`/boms/${id}`, { token }).then((b) => { setBom(b); setNotas(b.notas || ''); }).catch((err) => setError(err.message));
    apiFetch(`/boms/${id}/hardware-items`, { token }).then(setHardwareItems).catch(() => {});
    apiFetch(`/boms/${id}/cotizacion-implementacion`, { token }).then(setCotizacion).catch(() => {});
    apiFetch(`/boms/${id}/especificacion`, { token }).then(setEspecificacion).catch(() => {});
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

  return (
    <div className="content">
      <PageHeader
        back="/"
        title={bom.nombre}
        subtitle={<>
          Cliente: <strong>{bom.cliente_nombre}</strong> &nbsp;·&nbsp;
          Comercial: <strong>{bom.comercial_nombre || '—'}</strong> &nbsp;·&nbsp;
          Ubicación: <strong>{bom.ubicacion_proyecto || '—'}</strong> &nbsp;·&nbsp;
          Creado por {bom.creador_nombre}
        </>}
        actions={<Badge variant="info">{bom.estado}</Badge>}
      />

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stack" style={{ marginBottom: 24 }}>
        <ComponentCard
          icon={IconBox} title="Hardware" to={`/boms/${id}/hardware`}
          description="Cantidad, precio y SKU de los equipos del proyecto."
          included={hardwareItems.length > 0}
          status={hardwareItems.length > 0 ? `${hardwareItems.length} ítem(s) · $${money(totalHardware)} COP` : 'No incluido'}
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
        />
        <ComponentCard
          icon={IconShield} title="Servicios Netmask" to={`/boms/${id}/servicios`}
          description="SLA, cobertura y alcance del servicio gestionado."
          included={!!especificacion}
          status={especificacion ? especificacion.estado : 'No incluido'}
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
