-- Troubleshooting agosto 2026: separa el catalogo de Implementacion por marca
-- (Fortinet, Cisco, ...). Cada grupo ahora vive dentro de una marca, lo que
-- permite nombres de grupo repetidos entre marcas distintas (ej. "Switching e
-- Inalambrico" existe tanto en Fortinet como en Cisco, cada uno con sus propias
-- tecnologias).

CREATE TABLE catalogo_impl_marcas (
  id SERIAL PRIMARY KEY,
  nombre TEXT UNIQUE NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO catalogo_impl_marcas (nombre) VALUES ('Fortinet'), ('Cisco');

ALTER TABLE catalogo_impl_grupos ADD COLUMN marca_id INTEGER REFERENCES catalogo_impl_marcas(id);

-- Grupos que hoy son 100% Fortinet se reasignan directo.
UPDATE catalogo_impl_grupos SET marca_id = (SELECT id FROM catalogo_impl_marcas WHERE nombre = 'Fortinet')
  WHERE nombre IN ('Apliances Forti', 'Seguridad Perimetral');

-- "Switching e Inalambrico" existente se queda en Cisco (el resto/default
-- segun lo acordado); se crea un grupo del mismo nombre bajo Fortinet y se
-- traslada ahi la unica tecnologia Fortinet que vivia mezclada en ese grupo.
-- La restriccion UNIQUE(nombre) original debe caer antes de insertar el
-- segundo grupo homonimo, o Postgres lo rechaza como duplicado.
UPDATE catalogo_impl_grupos SET marca_id = (SELECT id FROM catalogo_impl_marcas WHERE nombre = 'Cisco')
  WHERE nombre = 'Switching e Inalambrico';

ALTER TABLE catalogo_impl_grupos DROP CONSTRAINT catalogo_impl_grupos_nombre_key;

INSERT INTO catalogo_impl_grupos (nombre, marca_id)
  VALUES ('Switching e Inalambrico', (SELECT id FROM catalogo_impl_marcas WHERE nombre = 'Fortinet'));

UPDATE catalogo_impl_tecnologias SET grupo_id = (
  SELECT g.id FROM catalogo_impl_grupos g
  WHERE g.nombre = 'Switching e Inalambrico' AND g.marca_id = (SELECT id FROM catalogo_impl_marcas WHERE nombre = 'Fortinet')
) WHERE nombre = 'SW Core Forti';

-- Cualquier grupo que por alguna razon quede sin marca cae en Cisco por defecto.
UPDATE catalogo_impl_grupos SET marca_id = (SELECT id FROM catalogo_impl_marcas WHERE nombre = 'Cisco') WHERE marca_id IS NULL;

ALTER TABLE catalogo_impl_grupos ALTER COLUMN marca_id SET NOT NULL;
ALTER TABLE catalogo_impl_grupos ADD CONSTRAINT catalogo_impl_grupos_marca_nombre_key UNIQUE (marca_id, nombre);
