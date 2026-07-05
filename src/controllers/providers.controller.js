// Controlador de prestadores
const providersService = require('../services/providers.service');
const { successResponse } = require('../utils/responses');

/**
 * GET /api/v1/providers
 * Listado público con filtros opcionales: ?category=&location=&search=
 */
const getProviders = async (req, res, next) => {
  try {
    const { category, location, search } = req.query;
    const providers = await providersService.getProviders({ category, location, search });
    return successResponse(res, 'Prestadores obtenidos exitosamente', { providers });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/providers/me/bookings
 */
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await providersService.getMyBookings(req.user.id);
    return successResponse(res, 'Reservas obtenidas exitosamente', { bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/providers/:id
 */
const getProviderById = async (req, res, next) => {
  try {
    const provider = await providersService.getProviderById(req.params.id);
    return successResponse(res, 'Prestador obtenido exitosamente', { provider });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/providers/:id/availability?date=YYYY-MM-DD
 */
const getAvailability = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Parámetro requerido: date (YYYY-MM-DD)',
      });
    }
    const hours = await providersService.getAvailability(req.params.id, date);
    return successResponse(res, 'Disponibilidad obtenida exitosamente', { available_hours: hours });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/providers/me
 */
const getMyProfile = async (req, res, next) => {
  try {
    const profile = await providersService.getMyProfile(req.user.id);
    return successResponse(res, 'Perfil obtenido exitosamente', { provider: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/providers/me
 * Acepta también specialties, consultation_address y availability para guardar
 * servicios, dirección de consulta y horarios semanales del prestador.
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const {
      name, phone, rut, bio, hourly_rate,
      experience_years, avatar_url, consultation_address,
      certificationIds, communeIds, specialties, availability,
    } = req.body;
    const updated = await providersService.updateMyProfile(req.user.id, {
      name, phone, rut, bio, hourly_rate,
      experience_years, avatar_url, consultation_address,
      certificationIds, communeIds, specialties, availability,
    });
    return successResponse(res, 'Perfil actualizado exitosamente', { provider: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/certifications
 */
const getCertifications = async (req, res, next) => {
  try {
    const certifications = await providersService.getCertifications();
    return successResponse(res, 'Certificaciones obtenidas exitosamente', { certifications });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProviders,
  getProviderById,
  getAvailability,
  getMyProfile,
  updateMyProfile,
  getMyBookings,
  getCertifications,
};
