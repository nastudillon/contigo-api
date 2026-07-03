// Utilidades para manejo de JWT
const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Genera un token JWT con el payload del usuario
 * @param {object} payload - Datos del usuario: { id, name, email, role }
 * @returns {string} Token JWT firmado
 */
const generateToken = (payload) => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token JWT a verificar
 * @returns {object} Payload decodificado
 * @throws {Error} Si el token es inválido o expiró
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

module.exports = { generateToken, verifyToken };
