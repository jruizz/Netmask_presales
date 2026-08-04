-- Catalogo de Servicios Gestionados (Fase 5, migrado de NetmaskSpecGen de Jorge)
-- y las especificaciones de servicio que cuelgan de un BOM.

CREATE TABLE catalogo_serv_categorias_tecnologia (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE catalogo_serv_niveles (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE catalogo_serv_plantillas_escalamiento (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE catalogo_serv_escalamiento_niveles (
  id SERIAL PRIMARY KEY,
  plantilla_id INTEGER NOT NULL REFERENCES catalogo_serv_plantillas_escalamiento(id) ON DELETE CASCADE,
  severidad TEXT NOT NULL,
  nivel_inicial TEXT NOT NULL,
  responsable_netmask TEXT NOT NULL,
  tiempo_respuesta TEXT NOT NULL,
  tiempo_escalamiento TEXT NOT NULL,
  siguiente_nivel TEXT,
  canal TEXT,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE catalogo_serv_tipos (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  icono TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  descripcion TEXT,
  incluye JSONB NOT NULL DEFAULT '[]',
  excluye JSONB NOT NULL DEFAULT '[]',
  condiciones_cliente JSONB NOT NULL DEFAULT '[]',
  campos_dimensionamiento JSONB NOT NULL DEFAULT '[]',
  plantilla_escalamiento_default_id INTEGER REFERENCES catalogo_serv_plantillas_escalamiento(id),
  activo BOOLEAN NOT NULL DEFAULT true
);

-- Severidades por defecto (SLA_DEF): una unica plantilla global, se copia
-- como punto de partida editable a cada especificacion nueva.
CREATE TABLE catalogo_serv_severidades (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  nombre_severidad TEXT NOT NULL,
  descripcion TEXT,
  tiempo_respuesta TEXT NOT NULL,
  tiempo_solucion TEXT NOT NULL,
  color_hex TEXT NOT NULL,
  color_fondo_hex TEXT,
  orden INTEGER NOT NULL DEFAULT 0
);

-- Especificacion de servicio: 0 o 1 por BOM (UNIQUE en bom_id)
CREATE TABLE especificaciones (
  id SERIAL PRIMARY KEY,
  bom_id INTEGER NOT NULL UNIQUE REFERENCES boms(id) ON DELETE CASCADE,
  tipo_servicio_id INTEGER NOT NULL REFERENCES catalogo_serv_tipos(id),
  version TEXT NOT NULL DEFAULT '1.0',
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','revision_lider','aprobado_lider','revision_gerencia','aprobado','generado','rechazado')),
  datos_wizard JSONB NOT NULL DEFAULT '{}',
  creado_por INTEGER NOT NULL REFERENCES usuarios(id),
  actualizado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE especificaciones_historial_estado (
  id SERIAL PRIMARY KEY,
  especificacion_id INTEGER NOT NULL REFERENCES especificaciones(id) ON DELETE CASCADE,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
  comentario TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_especificaciones_historial_spec ON especificaciones_historial_estado(especificacion_id);
