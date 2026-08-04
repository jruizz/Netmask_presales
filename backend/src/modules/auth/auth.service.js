import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../db/pool.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../middlewares/errorHandler.js';

async function findUserByCorreo(correo) {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.correo, u.password_hash, u.activo, r.clave AS rol_clave, r.nombre_visible AS rol_nombre
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     WHERE u.correo = $1`,
    [correo]
  );
  return rows[0];
}

function toToken(user) {
  return jwt.sign(
    { id: user.id, correo: user.correo, rolClave: user.rol_clave },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

export async function login(correo, password) {
  const user = await findUserByCorreo(correo);
  if (!user || !user.activo) throw new HttpError(401, 'Credenciales invalidas');
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new HttpError(401, 'Credenciales invalidas');
  await query('UPDATE usuarios SET ultimo_login = now() WHERE id = $1', [user.id]);
  return {
    token: toToken(user),
    user: { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol_clave, rolNombre: user.rol_nombre },
  };
}

export async function getMe(userId) {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.correo, r.clave AS rol, r.nombre_visible AS rol_nombre
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     WHERE u.id = $1`,
    [userId]
  );
  if (rows.length === 0) throw new HttpError(404, 'Usuario no encontrado');
  return rows[0];
}
