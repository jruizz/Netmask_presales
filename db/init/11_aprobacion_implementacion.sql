-- Aprobacion opcional para Implementacion (Fase de troubleshooting, agosto 2026).
-- A diferencia de Servicios, la aprobacion aqui NO es obligatoria: es un checkbox
-- que marca el preventa cuando considera que la implementacion es "grande" segun
-- el cliente/proyecto -- criterio humano, no un umbral automatico de horas/costo.
-- Mientras requiere_aprobacion = false, la cotizacion sigue editable siempre (igual
-- que hoy); el estado solo empieza a bloquear edicion fuera de borrador/rechazado
-- cuando el preventa activa el checkbox.

ALTER TABLE cotizaciones_impl
  ADD COLUMN requiere_aprobacion BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','revision_lider','aprobado_lider','revision_gerencia','aprobado','generado','rechazado'));

CREATE TABLE cotizaciones_impl_historial_estado (
  id SERIAL PRIMARY KEY,
  cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones_impl(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  comentario TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cotizaciones_impl_historial_cot ON cotizaciones_impl_historial_estado(cotizacion_id);

-- Comentarios libres para el BOM consolidado (seccion "Comentarios" del Excel BOM).
ALTER TABLE boms ADD COLUMN notas TEXT;
