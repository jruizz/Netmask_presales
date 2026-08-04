import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from './errorHandler.js';

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new HttpError(401, 'Falta el token de autenticacion'));
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = payload;
    next();
  } catch {
    next(new HttpError(401, 'Token invalido o expirado'));
  }
}
