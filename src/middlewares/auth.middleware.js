// Middleware de autenticación: verifica el token JWT en el header Authorization
const { verifyToken } = require('../utils/jwt');
const { errorResponse } = require('../utils/responses');

/**
 * Verifica que la petición incluya un Bearer token válido.
 * Adjunta req.user = { id, name, email, role } si es válido.
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Token de autenticación requerido', 401);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return errorResponse(res, 'Token de autenticación requerido', 401);
    }

    const decoded = verifyToken(token);
    req.user = {
      id: decoded.id,
      name: decoded.name,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return errorResponse(res, 'El token ha expirado', 401);
    }
    return errorResponse(res, 'Token inválido', 401);
  }
};

module.exports = authMiddleware;
