-- Documentos generados (Fase 6): Excel de cotizacion, Word de especificacion,
-- y los dos consolidados a nivel de BOM (Excel BOM con precios, Word Propuesta
-- Tecnica solo de alcance). El contenido binario se guarda en la propia fila
-- (volumen esperado bajo para una herramienta interna); si el volumen crece
-- se puede migrar a almacenamiento de objetos sin cambiar el contrato de API.

CREATE TABLE documentos_generados (
  id SERIAL PRIMARY KEY,
  bom_id INTEGER NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('excel_bom','word_propuesta_tecnica','excel_cotizacion','word_especificacion')),
  nombre_archivo TEXT NOT NULL,
  content_type TEXT NOT NULL,
  contenido BYTEA NOT NULL,
  tamano_bytes INTEGER NOT NULL,
  generado_por INTEGER NOT NULL REFERENCES usuarios(id),
  generado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documentos_generados_bom ON documentos_generados(bom_id);
