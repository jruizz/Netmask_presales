export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || 'Error interno' });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
