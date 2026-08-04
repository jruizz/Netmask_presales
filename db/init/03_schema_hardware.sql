-- Catalogo de Hardware (Fase 3) y linea de items de Hardware por BOM.
-- El catalogo arranca vacio y se alimenta a necesidad desde la UI.

CREATE TABLE catalogo_hardware (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  sku TEXT UNIQUE,
  numero_parte TEXT,
  descripcion TEXT,
  precio NUMERIC(14,2) NOT NULL DEFAULT 0,
  moneda TEXT NOT NULL DEFAULT 'COP',
  -- FK a catalogo_impl_tecnologias (tabla de la Fase 4): se agrega con ALTER TABLE
  -- cuando esa tabla exista. Es la base del vinculo Hardware -> Implementacion.
  tecnologia_impl_sugerida_id INTEGER,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalogo_hardware_nombre ON catalogo_hardware (nombre);

CREATE TABLE bom_hardware_items (
  id SERIAL PRIMARY KEY,
  bom_id INTEGER NOT NULL REFERENCES boms(id) ON DELETE CASCADE,
  hardware_id INTEGER NOT NULL REFERENCES catalogo_hardware(id),
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio_unitario_snapshot NUMERIC(14,2) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bom_hardware_items_bom ON bom_hardware_items(bom_id);
