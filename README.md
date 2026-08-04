# Netmask Presales

Plataforma unificada de preventa de Netmask SAS. Reemplaza dos herramientas previas e independientes:

- **Calculadora de Servicios** (Samuel): dimensionaba horas y costo de **implementación** técnica (catálogo de tecnologías Fortinet/Cisco, modos EPSP y Netmask, viáticos).
- **NetmaskSpecGen** (Jorge): documentaba el alcance contractual de **servicios gestionados** (soporte, NOC, IaaS, mesa de ayuda, etc.) mediante un wizard y generaba un Word corporativo.

Ambas quedaron reemplazadas por un solo concepto central: el **BOM (Bill of Materials)** de un proyecto, compuesto por hasta tres bloques **opcionales e independientes** — Hardware, Implementación y Servicios Netmask — que se pueden combinar libremente según lo que necesite cada proyecto.

## Índice

- [Arquitectura](#arquitectura)
- [Requisitos previos](#requisitos-previos)
- [Despliegue](#despliegue)
- [Primer uso](#primer-uso)
- [Funcionalidades](#funcionalidades)
- [Modelo de roles y permisos](#modelo-de-roles-y-permisos)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Operación y mantenimiento](#operación-y-mantenimiento)
- [Seguridad](#seguridad)
- [Limitaciones conocidas / pendientes](#limitaciones-conocidas--pendientes)

## Arquitectura

Cuatro servicios en Docker Compose, con **un único puerto publicado al host** (el del proxy):

| Servicio | Imagen base | Rol | Puerto publicado |
|---|---|---|---|
| `proxy` | `nginx:alpine` | Enruta `/` al frontend y `/api/` al backend | **Sí** (`PUBLISHED_PORT`, por defecto 8080) |
| `frontend` | Node 20 (build) → `nginx:alpine` | SPA en React (Vite) | No |
| `backend` | `node:20-alpine` | API REST en Express + motor de cálculo + generación de documentos | No |
| `db` | `postgres:16-alpine` | Toda la persistencia de la aplicación | No |

`backend`, `frontend` y `db` solo son alcanzables dentro de la red interna de Docker (`netmask_net`); nada además del proxy queda expuesto al host.

**Stack técnico**: Express + PostgreSQL (`pg`) + JWT/bcrypt en el backend; React 18 + React Router en el frontend, sin framework de CSS (sistema de diseño propio en `frontend/src/styles/global.css`); `exceljs` y `docx` para la generación de documentos.

## Requisitos previos

- Docker y Docker Compose (Docker Desktop en Windows/Mac, o Docker Engine + Compose plugin en Linux).
- Ningún otro requisito en el host: Node/Postgres corren solo dentro de los contenedores.

## Despliegue

1. Copia el archivo de variables de entorno de ejemplo y edítalo:
   ```bash
   cp .env.example .env
   ```
   Como mínimo, cambia `POSTGRES_PASSWORD`, `JWT_SECRET` y `SUPERADMIN_PASSWORD` por valores propios. `.env` nunca debe subirse a un repositorio (ya está en `.gitignore`).

2. Levanta el stack:
   ```bash
   docker compose up -d --build
   ```

3. La primera vez que el backend arranca contra una base de datos vacía:
   - Postgres ejecuta automáticamente todos los scripts de `db/init/` (esquema completo + catálogos semilla).
   - El backend crea el usuario **superadmin** con los datos de `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` del `.env`, **solo si aún no existe ningún usuario**.

4. Abre `http://localhost:8080` (o el puerto que hayas puesto en `PUBLISHED_PORT`).

### Reconstruir un servicio después de un cambio

```bash
docker compose up -d --build backend     # o frontend
```

### Aplicar una migración de base de datos nueva

Los archivos de `db/init/` **solo se ejecutan automáticamente la primera vez** que el volumen de Postgres está vacío. Para aplicar un archivo nuevo sobre una base ya inicializada:

```bash
docker compose exec -T db psql -U netmask -d netmask_presales -v ON_ERROR_STOP=1 < db/init/NN_archivo.sql
```

## Primer uso

1. Inicia sesión con el correo/contraseña de `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`.
2. Desde el Dashboard, crea un **Nuevo BOM** eligiendo o creando un cliente.
3. Desde el resumen del BOM, configura los componentes que necesites (Hardware / Implementación / Servicios Netmask) — ninguno es obligatorio, y se pueden combinar en cualquier orden.
4. Genera los documentos individuales o consolidados desde la misma pantalla.

## Funcionalidades

### Dashboard
Lista de BOMs. Los roles con visibilidad ampliada (`superadmin`, `gerencia`) ven todos los proyectos de la organización por defecto, con un filtro para acotar a los propios; el resto de roles solo ve los BOMs que creó.

### BOM (Bill of Materials)
Entidad central asociada a un cliente. Cada BOM puede incluir, en cualquier combinación, hasta un bloque de cada uno de los tres componentes:

- **Hardware**: catálogo compartido de ítems (nombre, SKU, número de parte, descripción, precio) que se alimenta a necesidad — cualquier usuario puede dar de alta un ítem nuevo al agregarlo por primera vez a un BOM, reutilizable después en cualquier otro proyecto. Cada ítem del catálogo puede tener una **tecnología de Implementación sugerida**: si el BOM ya tiene hardware asociado a una tecnología, el wizard de Implementación pre-marca esa tecnología como sugerencia editable.
- **Implementación**: motor de cálculo de horas/costo portado del catálogo original de Samuel (79 actividades reales, 12 tecnologías, tarifas por nivel/condición, Site Survey, bolsa de horas). Dos modos:
  - **Netmask**: costo en COP (horas × tarifa de nivel + viáticos + 8% de Gerencia de Proyectos si el total supera 24h).
  - **EPSP**: conversión a días EPSP para el programa de partner TD Synnex/Fortinet, sin valor monetario.
- **Servicios Netmask**: especificación contractual de un servicio gestionado (Contrato de Soporte, Bolsa de Horas, IaaS, NOC, Mesa de Ayuda, Assessment, Outsourcing de TI — catálogo real migrado de NetmaskSpecGen), con dimensionamiento propio por tipo, SLA por severidad, matriz de escalamiento (interna + contactos del cliente), canales/entregables y alcance/exclusiones. Incluye un **flujo de aprobación con máquina de estados**: `borrador → revisión Líder Técnico → aprobado Líder Técnico → revisión Gerencia → aprobado → generado` (con posibilidad de rechazo y reenvío en cualquiera de las dos revisiones), con historial completo de quién aprobó/rechazó y cuándo.

### Generación de documentos
- **Excel — Cotización de Implementación**: desglose por bloque/actividad y totales.
- **Word — Especificación de Servicio**: documento de 16 secciones (portada, control documental, resumen ejecutivo, SLA, matriz de escalamiento, responsabilidades, firma, etc.) con el logo y colores corporativos reales.
- **Excel — BOM consolidado**: hardware con precios + costo de implementación + total general (con precios).
- **Word — Propuesta Técnica**: alcance de implementación y de servicio gestionado combinados, **sin horas ni precios**, pensado para compartir con el cliente.

Los cuatro se generan server-side y quedan guardados (contenido binario en la propia base de datos) para descarga posterior.

### Biblioteca de documentos
Vista transversal de todos los documentos generados en la organización, con el mismo criterio de visibilidad por rol que el Dashboard, y filtro por tipo de documento.

### Auditoría
Registro automático de toda operación de creación/edición/eliminación y de las transiciones de estado de especificaciones, incluyendo intentos denegados (permisos insuficientes, login fallido), visible solo para `superadmin`/`gerencia`.

### Usuarios y Roles
Gestión de cuentas (alta, activar/desactivar) y una **matriz de permisos por rol editable en caliente** — un `superadmin` puede cambiar qué puede hacer cada rol sin necesidad de tocar código.

## Modelo de roles y permisos

Roles: `superadmin`, `gerencia`, `lider_tecnico`, `ingenieria`, `comercial`, `solo_lectura`.

Permisos base: `ver`, `crear`, `editar`, `aprobar_lider`, `aprobar_final`, `descargar`, `administrar_catalogos`, `administrar_usuarios`, `ver_auditoria`. La asignación rol↔permiso vive en base de datos (tablas `roles`, `permisos`, `roles_permisos`) y es editable desde **Usuarios y Roles** — no está hardcodeada en el código.

## Estructura del repositorio

```
db/init/            Esquema SQL + catálogos semilla, numerados en orden de ejecución
backend/src/
  config/           Carga de variables de entorno
  db/               Pool de conexión a Postgres
  middlewares/       authMiddleware (JWT), roleGuard, auditMiddleware, errorHandler
  modules/           Un folder por dominio: auth, usuarios, clientes, boms,
                     catalogo-hardware, catalogo-implementacion, catalogo-servicios,
                     cotizaciones (motor de cálculo), especificaciones, documentos,
                     roles, auditoria
  assets/           Logo corporativo (reutilizado en los documentos Word)
frontend/src/
  pages/            Una página por ruta (Dashboard, Bom*, Biblioteca, Auditoria, Usuarios...)
  components/       AppShell (layout), Button, Card, Badge, PageHeader, EmptyState, iconos
  styles/           global.css — sistema de diseño (paleta de marca vía CSS variables)
  store/            AuthContext (sesión)
  services/         Cliente HTTP (api.js)
proxy/conf.d/       Configuración de nginx (routing)
docker-compose.yml
.env.example
```

## Operación y mantenimiento

- **Backups**: toda la información (catálogos, BOMs, cotizaciones, especificaciones, documentos generados, auditoría) vive en el volumen Docker `pgdata` de Postgres. Un `pg_dump` periódico de ese contenedor cubre el respaldo completo de la aplicación.
- **Logs**: `docker compose logs -f backend` (o `frontend`, `db`, `proxy`).
- **Rotar el secreto JWT o la contraseña del superadmin**: cambiar el valor en `.env` y reiniciar el backend (`docker compose up -d --build backend`) — no invalida sesiones activas hasta que expiren, dado que son JWT stateless.

## Seguridad

- Contraseñas con `bcrypt` (nunca texto plano).
- Autenticación por JWT (`JWT_SECRET`, `JWT_EXPIRES_IN` configurables).
- Autorización por permiso (`roleGuard`) verificada contra la base de datos en cada solicitud, no contra listas fijas en el código.
- Solo el servicio `proxy` publica un puerto; `backend`, `frontend` y `db` son inalcanzables desde fuera de la red interna de Docker.
- CORS restringido al origen configurado en `CORS_ORIGIN`.
- Auditoría transversal de toda mutación (exitosa o denegada), incluyendo intentos de login fallidos (sin registrar nunca la contraseña).
- Ningún secreto vive en el código fuente: todos se inyectan por variable de entorno desde `.env` (no versionado).

## Limitaciones conocidas / pendientes

- **Gestión de clientes**: hoy solo se crean/editan de forma inline al crear un BOM; no existe todavía una pantalla dedicada de administración de clientes.
- **Generación asistida por IA**: la función "Generar con IA" del prototipo original (redacción del resumen ejecutivo) quedó **fuera de alcance** — no está implementada. El módulo de documentos sí deja un punto de extensión pensado para habilitarla más adelante desde el backend (nunca desde el navegador), sin requerir cambios de esquema.
- **Almacenamiento de documentos**: el contenido binario de los documentos generados se guarda directamente en Postgres. Es adecuado para el volumen esperado de una herramienta interna; si el volumen crece mucho, se puede migrar a almacenamiento de archivos/objetos sin cambiar el contrato de la API.
