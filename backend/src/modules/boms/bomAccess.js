import * as bomsService from './boms.service.js';

// Verifica que el usuario tenga acceso al BOM referenciado por req.params.bomId
// (lanza HttpError 403/404 via bomsService.getBom si no). Antes duplicado
// identico en cada router de sub-recurso de un BOM.
export async function assertBomAccess(req) {
  await bomsService.getBom(req.params.bomId, req.user);
}
