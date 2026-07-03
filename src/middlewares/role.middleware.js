// Middleware de autorización por roles
const { errorResponse } = require('../utils/responses');

/**
 * Verifica que el usuario autenticado tenga uno de los roles permitidos.
 * Debe usarse después de authMiddleware.
 * @param {string[]} allowedRoles - Array de roles permitidos
 * @returns {function} Middleware de Express
 *
 * Uso: roleMiddleware(['admin']) o roleMiddleware(['prestador', 'admin'])
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'No autenticado', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(
        res,
        'No tienes permisos para realizar esta acción',
        403
      );
    }

    next();
  };
};

module.exports = roleMiddleware;
