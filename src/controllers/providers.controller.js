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
 * Reservas del prestador autenticado (debe ir ANTES de /:id para no colisionar)
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
 * Detalle público de un prestador: datos + servicios + condiciones + reseñas
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
 * Disponibilidad horaria de un prestador en una fecha
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
 * PUT /api/v1/providers/me
 * Actualiza el perfil del prestador autenticado
 */
const updateMyProfile = async (req, res, next) => {
  try {
    const { bio, hourly_rate, experience_years, location, avatar_url } = req.body;
    const updated = await providersService.updateMyProfile(req.user.id, {
      bio,
      hourly_rate,
      experience_years,
      location,
      avatar_url,
    });
    return successResponse(res, 'Perfil actualizado exitosamente', { provider: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProviders,
  getProviderById,
  getAvailability,
  updateMyProfile,
  getMyBookings,
};
