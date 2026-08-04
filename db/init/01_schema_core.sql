-- Esquema core: roles, permisos, usuarios, clientes, auditoria.
-- Este archivo se ejecuta automaticamente por la imagen de postgres
-- (docker-entrypoint-initdb.d) solo la primera vez que el volumen esta vacio.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  nombre_visible TEXT NOT NULL,
  descripcion TEXT
);

CREATE TABLE permisos (
  id SERIAL PRIMARY KEY,
  clave TEXT UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE roles_permisos (
  rol_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id INTEGER NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  correo TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol_id INTEGER NOT NULL REFERENCES roles(id),
  activo BOOLEAN NOT NULL DEFAULT true,
  ultimo_login TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  razon_social TEXT NOT NULL,
  nit TEXT,
  sector TEXT,
  contacto_nombre TEXT,
  contacto_correo TEXT,
  contacto_telefono TEXT,
  ciudad TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por INTEGER REFERENCES usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contactos_escalamiento_cliente (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT,
  telefono TEXT,
  correo TEXT,
  nivel_escalamiento INTEGER NOT NULL DEFAULT 1,
  orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE auditoria_log (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id),
  accion TEXT NOT NULL,
  entidad_tipo TEXT NOT NULL,
  entidad_id TEXT,
  detalle JSONB,
  ip_origen TEXT,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auditoria_entidad ON auditoria_log(entidad_tipo, entidad_id);
CREATE INDEX idx_usuarios_rol ON usuarios(rol_id);
CREATE INDEX idx_clientes_creado_por ON clientes(creado_por);

-- Roles base (Fase 1)
INSERT INTO roles (clave, nombre_visible, descripcion) VALUES
  ('superadmin',    'Super Administrador', 'Acceso total a la plataforma'),
  ('gerencia',      'Gerencia',            'Visibilidad de todos los proyectos y aprobacion final'),
  ('lider_tecnico', 'Lider Tecnico',       'Aprobacion tecnica y administracion de catalogos'),
  ('ingenieria',    'Ingenieria',          'Construccion de BOMs, cotizaciones y especificaciones'),
  ('comercial',     'Comercial',           'Creacion de BOMs y gestion de clientes'),
  ('solo_lectura',  'Solo Lectura',        'Consulta unicamente, sin permisos de escritura');

-- Permisos base (Fase 1) -- se amplia en fases posteriores segun se agreguen modulos
INSERT INTO permisos (clave, descripcion) VALUES
  ('ver',                    'Ver informacion existente'),
  ('crear',                  'Crear nuevos registros'),
  ('editar',                 'Editar registros existentes'),
  ('aprobar_lider',          'Aprobar como lider tecnico'),
  ('aprobar_final',          'Aprobar de forma final (gerencia)'),
  ('descargar',              'Descargar documentos generados'),
  ('administrar_catalogos',  'Editar catalogos base (hardware, implementacion, servicios)'),
  ('administrar_usuarios',   'Gestionar usuarios y roles'),
  ('ver_auditoria',          'Consultar el log de auditoria');

-- Matriz de permisos por rol
INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p WHERE r.clave = 'superadmin';

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.clave = 'gerencia' AND p.clave IN ('ver','crear','editar','aprobar_final','descargar','ver_auditoria');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.clave = 'lider_tecnico' AND p.clave IN ('ver','crear','editar','aprobar_lider','descargar','administrar_catalogos');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.clave = 'ingenieria' AND p.clave IN ('ver','crear','editar','descargar');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.clave = 'comercial' AND p.clave IN ('ver','crear','descargar');

INSERT INTO roles_permisos (rol_id, permiso_id)
SELECT r.id, p.id FROM roles r, permisos p
WHERE r.clave = 'solo_lectura' AND p.clave IN ('ver');
