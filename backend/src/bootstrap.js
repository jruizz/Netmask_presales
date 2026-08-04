import bcrypt from 'bcryptjs';
import { query } from './db/pool.js';
import { env } from './config/env.js';

export async function bootstrapSuperadmin() {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM usuarios');
  if (rows[0].total > 0) return;

  if (!env.superadminEmail || !env.superadminPassword) {
    console.warn('[bootstrap] No hay usuarios y faltan SUPERADMIN_EMAIL/SUPERADMIN_PASSWORD: no se creo ningun usuario inicial.');
    return;
  }

  const { rows: rolRows } = await query("SELECT id FROM roles WHERE clave = 'superadmin'");
  const passwordHash = await bcrypt.hash(env.superadminPassword, 10);
  await query(
    `INSERT INTO usuarios (nombre, correo, password_hash, rol_id) VALUES ($1, $2, $3, $4)`,
    [env.superadminNombre, env.superadminEmail, passwordHash, rolRows[0].id]
  );
  console.log(`[bootstrap] Usuario superadmin creado: ${env.superadminEmail}`);
}
