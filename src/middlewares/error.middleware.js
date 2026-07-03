// Middleware centralizado de manejo de errores
const { errorResponse } = require('../utils/responses');

/**
 * Manejo centralizado de errores.
 * Interpreta códigos de error de PostgreSQL y errores genéricos.
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('[ERROR]', err.message || err);

  // Error de violación de unicidad en PostgreSQL (ej: email duplicado)
  if (err.code === '23505') {
    return errorResponse(res, 'El recurso ya existe (dato duplicado)', 409);
  }

  // Error de clave foránea no encontrada
  if (err.code === '23503') {
    return errorResponse(res, 'Referencia a recurso inexistente', 400);
  }

  // Error de validación de restricción
  if (err.code === '23514') {
    return errorResponse(res, 'Valor fuera del rango permitido', 400);
  }

  // Error personalizado con statusCode
  if (err.statusCode) {
    return errorResponse(res, err.message, err.statusCode);
  }

  // Error genérico del servidor
  return errorResponse(
    res,
    err.message || 'Error interno del servidor',
    500
  );
};

module.exports = errorMiddleware;
