// Controlador de autenticación: register, login, me
const authService = require('../services/auth.service');
const { successResponse } = require('../utils/responses');

/**
 * POST /api/v1/auth/register
 * Registra un nuevo usuario (adulto_mayor, familiar, prestador)
 */
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role,
      especialidad,
      region_id,
      contactoNombre,
      contactoTelefono,
      contactoRelacion,
    } = req.body;

    // Validaciones mínimas
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: name, email, password, role',
      });
    }

    const result = await authService.register({
      name,
      email,
      phone,
      password,
      role,
      especialidad,
      region_id,
      contactoNombre,
      contactoTelefono,
      contactoRelacion,
    });

    return successResponse(res, 'Usuario registrado exitosamente', result, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 * Autentica al usuario y retorna token JWT
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: email, password',
      });
    }

    const result = await authService.login({ email, password });
    return successResponse(res, 'Inicio de sesión exitoso', result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 * Retorna el perfil del usuario autenticado
 */
const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return successResponse(res, 'Perfil obtenido exitosamente', { user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/google
 * Recibe el credential (ID token de Google) y devuelve JWT interno + usuario.
 */
const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Campo requerido: credential' });
    }
    const result = await authService.googleLogin({ credential });
    return successResponse(res, 'Sesión iniciada con Google exitosamente', result);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/auth/complete-profile
 * Completa el onboarding del usuario autenticado.
 */
const completeProfile = async (req, res, next) => {
  try {
    const { profileType } = req.body;

    if (!profileType) {
      return res.status(400).json({ success: false, message: 'Campo requerido: profileType' });
    }

    const result = await authService.completeProfile({
      userId: req.user.id,
      profileType,
    });

    return successResponse(res, 'Perfil completado exitosamente', result);
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, googleLogin, getMe, completeProfile };
