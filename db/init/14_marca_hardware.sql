-- Agrega la marca del fabricante al catalogo de Hardware (campo libre, no
-- catalogo aparte -- a diferencia de catalogo_impl_marcas, que si es un
-- catalogo cerrado para agrupar tecnologias de Implementacion).

ALTER TABLE catalogo_hardware ADD COLUMN marca TEXT;
