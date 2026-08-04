import { query } from '../../db/pool.js';
import { HttpError } from '../../middlewares/errorHandler.js';

export async function listClientes() {
  const { rows } = await query(
    'SELECT * FROM clientes WHERE activo = true ORDER BY razon_social ASC'
  );
  return rows;
}

export async function getCliente(id) {
  const { rows } = await query('SELECT * FROM clientes WHERE id = $1', [id]);
  if (rows.length === 0) throw new HttpError(404, 'Cliente no encontrado');
  return rows[0];
}

export async function crearCliente(data, creadoPorId) {
  const { razonSocial, nit, sector, contactoNombre, contactoCorreo, contactoTelefono, ciudad } = data;
  const { rows } = await query(
    `INSERT INTO clientes (razon_social, nit, sector, contacto_nombre, contacto_correo, contacto_telefono, ciudad, creado_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [razonSocial, nit, sector, contactoNombre, contactoCorreo, contactoTelefono, ciudad, creadoPorId]
  );
  return rows[0];
}

export async function actualizarCliente(id, data) {
  const { razonSocial, nit, sector, contactoNombre, contactoCorreo, contactoTelefono, ciudad } = data;
  const { rows } = await query(
    `UPDATE clientes SET razon_social = $1, nit = $2, sector = $3, contacto_nombre = $4,
       contacto_correo = $5, contacto_telefono = $6, ciudad = $7
     WHERE id = $8 RETURNING *`,
    [razonSocial, nit, sector, contactoNombre, contactoCorreo, contactoTelefono, ciudad, id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Cliente no encontrado');
  return rows[0];
}

export async function eliminarCliente(id) {
  const { rows } = await query(
    'UPDATE clientes SET activo = false WHERE id = $1 RETURNING id',
    [id]
  );
  if (rows.length === 0) throw new HttpError(404, 'Cliente no encontrado');
}
