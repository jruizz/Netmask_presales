-- Ajuste de roles a 5 niveles jerarquicos:
-- Super Administrador > Gerencia > Lider Tecnico > Preventa > Comercial
--
-- "ingenieria" pasa a llamarse "Preventa" (mismo id, mismos permisos: sigue
-- pudiendo crear/editar BOMs y especificaciones, pero necesita la aprobacion
-- del Lider Tecnico, que es quien conserva el permiso aprobar_lider).
-- "solo_lectura" se elimina (no tenia usuarios asignados).
-- "comercial" pasa a ser un rol de solo visibilidad: ver + descargar, sin crear/editar.

UPDATE roles SET clave = 'preventa', nombre_visible = 'Preventa' WHERE clave = 'ingenieria';

DELETE FROM roles WHERE clave = 'solo_lectura';

DELETE FROM roles_permisos
WHERE rol_id = (SELECT id FROM roles WHERE clave = 'comercial')
  AND permiso_id IN (SELECT id FROM permisos WHERE clave = 'crear');
