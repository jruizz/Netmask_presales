import bcrypt from 'bcryptjs';
import { query } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export async function listUsuarios() {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.correo, u.activo, u.ultimo_login, u.creado_en, r.clave AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     ORDER BY u.creado_en DESC`
  );
  return rows;
}

export async function crearUsuario({ nombre, correo, password, rolClave }) {
  const { rows: rolRows } = await query('SELECT id FROM roles WHERE clave = $1', [rolClave]);
  if (rolRows.length === 0) throw new HttpError(400, `Rol invalido: ${rolClave}`);
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await query(
      `INSERT INTO usuarios (nombre, correo, password_hash, rol_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, correo, activo, creado_en`,
      [nombre, correo, passwordHash, rolRows[0].id]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new HttpError(409, `Ya existe un usuario con el correo "${correo}"`);
    throw err;
  }
}

export async function actualizarEstadoUsuario(id, activo) {
  const { rows } = await query(
    'UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING id, nombre, correo, activo',
    [activo, id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Usuario no encontrado');
  return rows[0];
}
