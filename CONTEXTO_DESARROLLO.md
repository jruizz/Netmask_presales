# Contexto de desarrollo — Netmask Presales

Este documento es para retomar el desarrollo de este proyecto **en otra máquina**, con una sesión de Claude Code nueva (o cualquier desarrollador) que no tiene memoria de las conversaciones anteriores. Léelo completo antes de tocar código: explica no solo QUÉ existe, sino POR QUÉ está construido así, para no deshacer decisiones ya tomadas.

Para el "qué es esto y cómo se despliega" en limpio, ver [`README.md`](./README.md). Este archivo es el complemento: historial, decisiones, estado exacto y pendientes.

## 0. Cómo moverte a la otra máquina

1. Copia **toda la carpeta** `Netmask_Presales/` (no solo lo que esté en git — a la fecha de este documento el repo tiene `.git` inicializado pero **sin ningún commit todavía**, así que no asumas que un `git clone` te va a traer nada; copia la carpeta completa por USB/red/nube).
2. El archivo `.env` **no está trackeado por git** (`.gitignore`) — asegúrate de copiarlo aparte si copias solo lo versionado. Sin él no arranca nada (`DATABASE_URL`, `JWT_SECRET`, credenciales del superadmin).
3. En la máquina nueva, con Docker Desktop instalado:
   ```bash
   cd Netmask_Presales
   docker compose up -d --build
   ```
4. Si quieres partir de datos limpios (sin los BOMs/usuarios de prueba de este entorno), **no copies el volumen de Docker** — al no existir `pgdata`, Postgres se re-inicializa solo con `db/init/*.sql` (esquema + catálogos reales, sin datos de prueba).
5. Si en cambio quieres traerte el estado exacto de esta base (con los BOMs y usuarios de prueba actuales), hay que exportar/importar el volumen de Postgres:
   ```bash
   # en esta máquina
   docker compose exec -T db pg_dump -U netmask netmask_presales > respaldo.sql
   # en la máquina nueva, después de "docker compose up -d db" (solo el servicio db)
   docker compose exec -T db psql -U netmask -d netmask_presales < respaldo.sql
   ```

## 1. Qué es esto (resumen ultra corto)

Reemplaza dos prototipos previos (calculadora de horas/costo de Samuel + NetmaskSpecGen de Jorge) bajo un concepto único: un **BOM** por proyecto, con hasta 3 componentes **opcionales e independientes** — Hardware, Implementación, Servicios Netmask —, más generación de documentos, biblioteca, auditoría y administración de usuarios/roles/comerciales. Arquitectura: 4 servicios Docker (`proxy` nginx público, `frontend` React, `backend` Express, `db` Postgres), solo el proxy publica puerto.

## 2. Estado actual — todo lo siguiente está construido y verificado con pruebas reales (no solo "compila")

- **Fase 0-1**: esqueleto Docker + auth JWT/bcrypt + roleGuard basado en DB (no hardcodeado).
- **Fase 2**: entidad BOM + dashboard con visibilidad por rol (propios vs. todos).
- **Fase 3**: catálogo de Hardware (alimentado a necesidad) + líneas de ítems por BOM con snapshot de precio.
- **Fase 4**: catálogo de Implementación migrado fielmente (79 actividades reales, 12 tecnologías) + motor de cálculo EPSP/Netmask portado al backend + sugerencia Hardware→Implementación.
- **Fase 5**: catálogo de Servicios Netmask (7 tipos reales) + wizard + máquina de estados de aprobación de especificaciones.
- **Fase 6**: generación server-side de los 4 documentos (Excel Cotización, Word Especificación de 16 secciones con logo real, Excel BOM consolidado con precios, Word Propuesta Técnica sin precios/horas).
- **Fase 7**: biblioteca transversal de documentos, auditoría automática (middleware genérico, incluye intentos denegados), matriz de permisos por rol editable en vivo desde la UI.
- **Rediseño visual completo**: sistema de diseño propio en `frontend/src/styles/global.css`, con la **paleta de marca oficial** (ver sección 3) como única fuente de verdad, sidebar con logo real, componentes reutilizables (`Button`, `Card`, `Badge`, `PageHeader`, `EmptyState`).
- **Comerciales**: catálogo nuevo (roster real de 11 personas OT/IT) asociado a cada BOM, con página de administración (`/comerciales`, visible a Líder Técnico/Superadmin).
- **Cliente**: campo renombrado de "razón social" a "nombre del cliente" (columna de BD incluida, no solo la etiqueta).
- **Roles**: reestructurados a la jerarquía **Super Administrador > Gerencia > Líder Técnico > Preventa > Comercial** (se eliminó "Solo Lectura", "Ingeniería" pasó a llamarse "Preventa", y "Comercial" quedó con funciones de solo visibilidad: `ver` + `descargar`, sin `crear`/`editar`).
- **Bug corregido**: el manejador de errores no distinguía errores de validación (zod) de errores internos — todo devolvía 500. Ahora los errores de validación devuelven 400 con el detalle de qué campo falló. Esto afectaba a **toda** la API, no un endpoint puntual.

## 3. Decisiones que NO hay que deshacer sin querer (y por qué)

- **Paleta de marca**: los 9 colores oficiales (`--nm-gris`, `--nm-gris-claro`, `--nm-blanco`, `--nm-celeste-light`, `--nm-celeste-strong`, `--nm-celeste`, `--nm-azul`, `--nm-azul-2`, `--nm-azul-3`) viven **solo** en el bloque `:root` de `frontend/src/styles/global.css`. Todo lo demás (fondos, bordes, sombras, hovers) se deriva de ahí vía `var()` o `color-mix()` — nunca hardcodear un hex nuevo en ese archivo ni en los `.jsx`. La única excepción deliberada son los colores semánticos de estado (`--nm-success`, `--nm-warning`, `--nm-danger` — verde/ámbar/rojo), porque el manual de marca no cubre esos casos y son convención universal de UX para aprobado/en revisión/rechazado.
- **Modelo de BOM**: cada BOM puede tener **0 o 1** de cada componente (Hardware, Implementación, Servicios Netmask), en cualquier combinación, sin relación forzada entre ítems de un componente y otro — decisión explícita del usuario, no simplificación mía.
- **Documentos generados**: el contenido binario se guarda en la propia fila de Postgres (`documentos_generados.contenido BYTEA`), no en un volumen de archivos aparte. Es adecuado para el volumen esperado de una herramienta interna; si crece mucho se puede migrar a almacenamiento de objetos sin cambiar el contrato de la API.
- **Auditoría**: `backend/src/middlewares/auditMiddleware.js` es un middleware **transversal** que audita automáticamente toda mutación (POST/PUT/PATCH/DELETE), exitosa o no. Deliberadamente NO se instrumentó servicio por servicio — si agregas un endpoint mutante nuevo, ya queda auditado solo con montarlo bajo `/api/`.
- **Permisos por rol**: viven en las tablas `roles`/`permisos`/`roles_permisos` y son editables desde la UI (`/usuarios`, sección "Matriz de permisos"). **Nunca** hardcodear un array de roles permitidos directamente en un endpoint — usa `requirePermiso('clave')` (o `requireRole(...)` solo cuando de verdad tiene que ser ese rol exacto, como las transiciones de aprobación de especificaciones).
- **Sugerencia Hardware → Implementación**: `catalogo_hardware.tecnologia_impl_sugerida_id` es una sugerencia editable, no una relación forzada — el usuario puede quitarla o cambiarla libremente en el wizard de Implementación.
- **Feature de IA**: explícitamente fuera de alcance v1. `backend/src/modules/documentos/*.js` deja un punto de extensión (el contenido de cada sección pasa por un lugar único antes de ensamblar el documento) para conectar un servicio `ai-assist` más adelante **desde el backend**, nunca desde el navegador (así fallaba en el prototipo original de Jorge).

## 4. Datos actuales en la base de datos (snapshot al momento de escribir esto)

- **Usuarios**: `admin@netmask.co` (superadmin, contraseña la que esté en tu `.env`), más 3 usuarios de prueba/uso real creados durante el desarrollo (`ing.prueba@netmask.co` y `jruiz@netmask.co` con rol Preventa, `comercial.prueba@netmask.co` con rol Comercial).
- **Comerciales**: los 11 reales (5 OT + 6 IT) — este catálogo sí es dato real de negocio, no de prueba.
- **Clientes**: "Cliente Demo SAS" y "Cliente Prueba Comercial" son de prueba; **"Fanalca" fue creado por el usuario directamente en el navegador**, probablemente es real.
- **BOMs**: la mayoría llevan nombres tipo "Prueba X" (descartables). El BOM **"Firewall OT planta Solar Fanalca"** fue creado por el usuario en el navegador, no por mí — probablemente es un caso de uso real, no lo borres sin confirmar.
- Hay 8 documentos ya generados guardados en la base.

## 5. Hilos que quedaron abiertos en la conversación (por si el usuario los retoma)

- El usuario pidió un **diagrama del flujo del sistema y de la base de datos**; se cargaron las skills de diagramación pero el usuario interrumpió antes de que se generara nada, para preguntar cómo depurar cosas de diseño que no le gustaban. **No se llegó a crear ningún diagrama.**
- Quedó pendiente una ronda de **pulido visual** ("depurar cosas que no me gustan") — el usuario iba a señalar, pantalla por pantalla, qué ajustar del rediseño. No se concretó ningún cambio puntual todavía más allá de la paleta de marca oficial.
- Pendientes explícitos de fases anteriores, todavía no construidos: página dedicada de gestión de Clientes (hoy solo se crean/editan inline al crear un BOM), y la función "Generar con IA" (fuera de alcance v1, con punto de extensión ya documentado).

## 6. Gotchas / lecciones aprendidas durante el desarrollo

- **Los scripts de `db/init/*.sql` solo se ejecutan automáticamente la primera vez** que el volumen de Postgres está vacío. Para aplicar un `.sql` nuevo sobre una base ya inicializada: `docker compose exec -T db psql -U netmask -d netmask_presales -v ON_ERROR_STOP=1 < db/init/NN_archivo.sql`.
- **No escribas texto con tildes/ñ directamente en un `-d '...'` de curl dentro de este entorno Windows + Git Bash** — se corrompió la codificación al menos una vez (`Sebastián` → `Sebasti�n`) al escribir el JSON inline en un comando. Si necesitas mandar texto con acentos por curl para probar algo, escribe el JSON a un archivo primero y usa `-d @archivo.json`, o mejor, hazlo a través del propio frontend.
- Para inspeccionar/verificar contenido de un archivo generado (xlsx/docx) usando una librería que solo está instalada dentro del contenedor (`exceljs`, `docx`): `docker cp` el archivo hacia el contenedor y ejecuta el script de verificación con `docker compose exec backend node ...` — el host no tiene `node_modules` porque las dependencias solo se instalan dentro de la imagen.
- Node/Docker Desktop sí están disponibles en el host de desarrollo actual (usado para levantar el stack y para verificación puntual con `node -e` en el host cuando no depende de paquetes del backend).

## 7. Mapa de archivos (dónde está cada cosa)

```
db/init/                        Esquema SQL + seeds, en orden de ejecución (01 a 10 a la fecha)
backend/src/modules/<dominio>/   Un folder por dominio: auth, usuarios, clientes, comerciales, boms,
                                 catalogo-hardware, catalogo-implementacion, catalogo-servicios,
                                 cotizaciones (motor de cálculo puro en calcEngine.js),
                                 especificaciones, documentos (generadores xlsx/docx), roles, auditoria
backend/src/middlewares/         authMiddleware (JWT), roleGuard, auditMiddleware, errorHandler
backend/src/assets/              Logo corporativo en base64 (reutilizado en los Word generados)
frontend/src/pages/              Una página por ruta
frontend/src/components/         AppShell (layout+sidebar), Button, Card, Badge, PageHeader, EmptyState, icons
frontend/src/styles/global.css   Sistema de diseño — paleta de marca como única fuente de verdad
frontend/src/assets/logo.png     Mismo logo, como asset real para el frontend
proxy/conf.d/default.conf        Routing de nginx
docker-compose.yml, .env(.example)
README.md                        Documentación orientada a uso/despliegue
CONTEXTO_DESARROLLO.md           Este archivo
```

## 8. Cómo verificar que todo sigue vivo al llegar a la máquina nueva

```bash
docker compose ps                                   # los 4 servicios "Up", solo proxy con puerto publicado
curl http://localhost:8080/api/health                # {"ok":true}
# login con el superadmin de tu .env, luego GET /api/boms, /api/comerciales, /api/roles
# para confirmar que la base migró/restauró bien.
```
