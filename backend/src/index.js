import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { bootstrapSuperadmin } from './bootstrap.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { auditMiddleware } from './middlewares/auditMiddleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usuariosRouter } from './modules/usuarios/usuarios.routes.js';
import { clientesRouter } from './modules/clientes/clientes.routes.js';
import { bomsRouter } from './modules/boms/boms.routes.js';
import { hardwareItemsRouter } from './modules/boms/hardwareItems.routes.js';
import { catalogoHardwareRouter } from './modules/catalogo-hardware/catalogoHardware.routes.js';
import { catalogoImplementacionRouter } from './modules/catalogo-implementacion/catalogoImplementacion.routes.js';
import { cotizacionImplRouter } from './modules/boms/cotizacionImpl.routes.js';
import { sugerenciasRouter } from './modules/boms/sugerencias.routes.js';
import { catalogoServiciosRouter } from './modules/catalogo-servicios/catalogoServicios.routes.js';
import { especificacionRouter } from './modules/boms/especificacion.routes.js';
import { bomDocumentosRouter } from './modules/boms/documentos.routes.js';
import { documentosRouter } from './modules/documentos/documentos.routes.js';
import { auditoriaRouter } from './modules/auditoria/auditoria.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use(auditMiddleware);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/boms/:bomId/hardware-items', hardwareItemsRouter);
app.use('/api/boms/:bomId/cotizacion-implementacion', cotizacionImplRouter);
app.use('/api/boms/:bomId/sugerencias-implementacion', sugerenciasRouter);
app.use('/api/boms/:bomId/especificacion', especificacionRouter);
app.use('/api/boms/:bomId/documentos', bomDocumentosRouter);
app.use('/api/boms', bomsRouter);
app.use('/api/catalogo-hardware', catalogoHardwareRouter);
app.use('/api/catalogo-implementacion', catalogoImplementacionRouter);
app.use('/api/catalogo-servicios', catalogoServiciosRouter);
app.use('/api/documentos', documentosRouter);
app.use('/api/auditoria', auditoriaRouter);
app.use('/api/roles', rolesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

async function waitForDb(maxRetries = 20, delayMs = 1500) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.log(`[startup] Esperando base de datos (intento ${i}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('No se pudo conectar a la base de datos');
}

async function main() {
  await waitForDb();
  await bootstrapSuperadmin();
  app.listen(env.port, () => {
    console.log(`Backend Netmask Presales escuchando en puerto ${env.port}`);
  });
}

main().catch((err) => {
  console.error('Error fatal al iniciar el backend:', err);
  process.exit(1);
});
