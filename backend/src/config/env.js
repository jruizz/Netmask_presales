import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  superadminEmail: process.env.SUPERADMIN_EMAIL,
  superadminPassword: process.env.SUPERADMIN_PASSWORD,
  superadminNombre: process.env.SUPERADMIN_NOMBRE || 'Administrador',
};
