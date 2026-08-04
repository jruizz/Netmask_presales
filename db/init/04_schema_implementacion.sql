-- Catalogo de Implementacion (Fase 4, migrado de la Calculadora de Samuel)
-- y las cotizaciones de implementacion que cuelgan de un BOM.

CREATE TABLE catalogo_impl_grupos (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL
);

CREATE TABLE catalogo_impl_tecnologias (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES catalogo_impl_grupos(id),
  nombre TEXT UNIQUE NOT NULL,
  es_base BOOLEAN NOT NULL DEFAULT false,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE catalogo_impl_actividades (
  id SERIAL PRIMARY KEY,
  tecnologia_id INTEGER NOT NULL REFERENCES catalogo_impl_tecnologias(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  horas NUMERIC(6,2) NOT NULL,
  modo TEXT NOT NULL CHECK (modo IN ('en_sitio','remota')),
  unidades_por_equipo NUMERIC(4,2) NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE catalogo_impl_bloques_fijos (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('planeacion','entrega')),
  texto TEXT NOT NULL,
  horas NUMERIC(6,2) NOT NULL,
  modo TEXT NOT NULL CHECK (modo IN ('en_sitio','remota')),
  es_unitario BOOLEAN NOT NULL DEFAULT false,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE catalogo_impl_tarifas (
  id SERIAL PRIMARY KEY,
  nivel INTEGER NOT NULL CHECK (nivel IN (1,2,3)),
  condicion TEXT NOT NULL CHECK (condicion IN ('interno','aliado')),
  tarifa_cop_hora NUMERIC(12,2) NOT NULL,
  UNIQUE (nivel, condicion)
);

CREATE TABLE catalogo_impl_site_survey_rangos (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  etiqueta TEXT NOT NULL,
  horas_ingenieria NUMERIC(6,2) NOT NULL,
  horas_ekahau NUMERIC(6,2) NOT NULL,
  precio_fijo_cop NUMERIC(14,2) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE catalogo_impl_parametros (
  clave TEXT PRIMARY KEY,
  valor NUMERIC(14,4) NOT NULL,
  descripcion TEXT
);

-- Cierra el vinculo Hardware -> Implementacion abierto en la Fase 3
ALTER TABLE catalogo_hardware
  ADD CONSTRAINT fk_catalogo_hardware_tecnologia_sugerida
  FOREIGN KEY (tecnologia_impl_sugerida_id) REFERENCES catalogo_impl_tecnologias(id);

-- Cotizacion de implementacion: 0 o 1 por BOM (UNIQUE en bom_id)
CREATE TABLE cotizaciones_impl (
  id SERIAL PRIMARY KEY,
  bom_id INTEGER NOT NULL UNIQUE REFERENCES boms(id) ON DELETE CASCADE,
  modo TEXT NOT NULL CHECK (modo IN ('epsp','netmask')),
  nivel_ingenieria INTEGER NOT NULL DEFAULT 2 CHECK (nivel_ingenieria IN (1,2,3)),
  condicion TEXT NOT NULL DEFAULT 'interno' CHECK (condicion IN ('interno','aliado')),
  numero_plantas NUMERIC(6,2) NOT NULL DEFAULT 1,
  trm NUMERIC(10,2),
  bolsa_horas_activa BOOLEAN NOT NULL DEFAULT false,
  site_survey_activo BOOLEAN NOT NULL DEFAULT false,
  creado_por INTEGER NOT NULL REFERENCES usuarios(id),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cotizaciones_impl_sedes (
  id SERIAL PRIMARY KEY,
  cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones_impl(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ingenieros INTEGER NOT NULL DEFAULT 1,
  dias NUMERIC(6,2) NOT NULL DEFAULT 0,
  alimentacion_dia NUMERIC(12,2) NOT NULL DEFAULT 0,
  hospedaje_dia NUMERIC(12,2) NOT NULL DEFAULT 0,
  transporte_interno_dia NUMERIC(12,2) NOT NULL DEFAULT 0,
  transporte_aeropuerto NUMERIC(12,2) NOT NULL DEFAULT 0,
  vuelo NUMERIC(12,2) NOT NULL DEFAULT 0,
  es_local BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE cotizaciones_impl_tecnologias_seleccionadas (
  id SERIAL PRIMARY KEY,
  cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones_impl(id) ON DELETE CASCADE,
  tecnologia_id INTEGER NOT NULL REFERENCES catalogo_impl_tecnologias(id),
  factor_equipos NUMERIC(6,2) NOT NULL DEFAULT 1,
  UNIQUE (cotizacion_id, tecnologia_id)
);

CREATE TABLE cotizaciones_impl_site_survey_sedes (
  id SERIAL PRIMARY KEY,
  cotizacion_id INTEGER NOT NULL REFERENCES cotizaciones_impl(id) ON DELETE CASCADE,
  nombre_sede TEXT NOT NULL,
  rango_id INTEGER NOT NULL REFERENCES catalogo_impl_site_survey_rangos(id)
);

CREATE TABLE cotizaciones_impl_resultado (
  cotizacion_id INTEGER PRIMARY KEY REFERENCES cotizaciones_impl(id) ON DELETE CASCADE,
  total_horas NUMERIC(10,2) NOT NULL,
  pm_horas NUMERIC(10,2) NOT NULL,
  dias_epsp_trabajo NUMERIC(10,2),
  dias_epsp_viaticos NUMERIC(10,2),
  total_dias_epsp NUMERIC(10,2),
  viaticos_cop NUMERIC(14,2) NOT NULL,
  viaticos_usd NUMERIC(14,2),
  costo_ingenieria_cop NUMERIC(14,2),
  total_cop NUMERIC(14,2),
  detalle_calculo JSONB NOT NULL,
  calculado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
