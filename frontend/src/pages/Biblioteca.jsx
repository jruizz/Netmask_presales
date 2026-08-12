import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import { apiFetch, apiDownload } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';
import Card from '../components/Card.jsx';
import Button from '../components/Button.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { IconLibrary, IconDownload } from '../components/icons.jsx';
import { TIPOS_DOCUMENTO } from '../constants/documentos.js';
import Field from '../components/Field.jsx';

export default function Biblioteca() {
  const { token } = useAuth();
  const [documentos, setDocumentos] = useState([]);
  const [tipo, setTipo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/documentos${tipo ? `?tipo=${tipo}` : ''}`, { token })
      .then(setDocumentos)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token, tipo]);

  return (
    <div className="content content-wide">
      <PageHeader title="Biblioteca de documentos" subtitle="Todos los Excel y Word generados, con acceso según tu rol." />

      <Field label="Filtrar por tipo" style={{ maxWidth: 320, marginBottom: 16 }}>
        <select className="input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos</option>
          {Object.entries(TIPOS_DOCUMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>

      {error && <div className="alert alert-danger">{error}</div>}

      <Card style={{ padding: 0 }}>
        {loading ? (
          <div className="spinner-wrap">Cargando...</div>
        ) : documentos.length === 0 ? (
          <EmptyState icon={IconLibrary} title="Sin documentos" description="No hay documentos generados todavía (o ninguno visible para tu rol)." />
        ) : (
          <div className="table-wrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Tipo</th><th>Archivo</th><th>BOM</th><th>Cliente</th><th>Generado por</th><th>Fecha</th><th></th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => (
                  <tr key={d.id}>
                    <td>{TIPOS_DOCUMENTO[d.tipo] || d.tipo}</td>
                    <td className="muted">{d.nombre_archivo}</td>
                    <td><Link to={`/boms/${d.bom_id}`}>{d.bom_nombre}</Link></td>
                    <td>{d.cliente_nombre}</td>
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
