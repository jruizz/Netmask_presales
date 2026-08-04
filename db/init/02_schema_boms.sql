-- BOM: entidad central del flujo (Fase 2). Cada BOM puede tener 0 o 1 de cada
-- componente (Hardware, Implementacion, Servicios Netmask); esos componentes
-- se agregan en fases posteriores con su propia tabla y un bom_id FK nullable.

CREATE TABLE boms (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  nombre TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador',
  creado_por INTEGER NOT NULL REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_boms_cliente ON boms(cliente_id);
CREATE INDEX idx_boms_creado_por ON boms(creado_por);
