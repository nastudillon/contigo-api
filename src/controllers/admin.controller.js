// Controlador de administración
const adminService = require('../services/admin.service');
const { successResponse } = require('../utils/responses');

/**
 * GET /api/v1/admin/providers
 * Lista todos los prestadores para el panel admin
 */
const getProviders = async (req, res, next) => {
  try {
    const providers = await adminService.getAllProviders();
    return successResponse(res, 'Prestadores obtenidos exitosamente', { providers });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/admin/providers/:id/validate
 * Aprueba o rechaza un prestador
 * Body: { action: 'approve' | 'reject' }
 */
const validateProvider = async (req, res, next) => {
  try {
    const { action } = req.body;
    const provider = await adminService.validateProvider(req.params.id, action);
    const msg = action === 'approve' ? 'Prestador aprobado exitosamente' : 'Prestador rechazado';
    return successResponse(res, msg, { provider });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/bookings
 * Lista todas las reservas para el panel admin
 */
const getBookings = async (req, res, next) => {
  try {
    const bookings = await adminService.getAllBookings();
    return successResponse(res, 'Reservas obtenidas exitosamente', { bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/admin/stats
 * Estadísticas generales del sistema
 */
const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getStats();
    return successResponse(res, 'Estadísticas obtenidas exitosamente', stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProviders, validateProvider, getBookings, getStats };
