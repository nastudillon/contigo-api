// Utilidades para formato estándar de respuestas HTTP

/**
 * Respuesta exitosa
 * @param {object} res - Express response object
 * @param {string} message - Mensaje descriptivo
 * @param {any} data - Datos a retornar
 * @param {number} statusCode - Código HTTP (default 200)
 */
const successResponse = (res, message, data = null, statusCode = 200) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

/**
 * Respuesta de error
 * @param {object} res - Express response object
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código HTTP (default 500)
 * @param {any} errors - Detalles adicionales del error (opcional)
 */
const errorResponse = (res, message, statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { successResponse, errorResponse };
