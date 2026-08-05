-- Catalogo de comerciales (OT/IT) asociados a un BOM, y ajustes de nomenclatura:
-- "razon_social" pasa a llamarse "nombre_cliente" (mismo dato, termino mas simple
-- de preventa), y el BOM agrega a que comercial esta asociado y la ubicacion
-- fisica del proyecto (que puede ser distinta a la ciudad registrada del cliente).

CREATE TABLE comerciales (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  sector TEXT NOT NULL CHECK (sector IN ('OT', 'IT')),
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO comerciales (nombre, sector) VALUES
  ('David Castrillón', 'OT'),
  ('Paulina Henao', 'OT'),
  ('Alejandro Cuadros', 'OT'),
  ('Juan José Gaviria', 'OT'),
  ('Sebastian Isaza', 'OT'),
  ('Esteban Gomez', 'IT'),
  ('David Cano', 'IT'),
  ('Sebastian Castrillón', 'IT'),
  ('Daniela Martinez', 'IT'),
  ('Julian Abello', 'IT'),
  ('Ana Linda Farkas', 'IT');

ALTER TABLE boms ADD COLUMN comercial_id INTEGER REFERENCES comerciales(id);
ALTER TABLE boms ADD COLUMN ubicacion_proyecto TEXT;

ALTER TABLE clientes RENAME COLUMN razon_social TO nombre_cliente;
