// Controlador de reservas
const bookingsService = require('../services/bookings.service');
const { successResponse } = require('../utils/responses');

/**
 * GET /api/v1/bookings/me
 * Lista las reservas del usuario autenticado (como cliente)
 */
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await bookingsService.getMyBookings(req.user.id);
    return successResponse(res, 'Reservas obtenidas exitosamente', { bookings });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/bookings
 * Crea una nueva reserva para el usuario autenticado
 */
const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingsService.createBooking(req.user.id, req.body);
    return successResponse(res, 'Reserva creada exitosamente', { booking }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/bookings/:id/cancel
 * Cancela una reserva (solo el cliente dueño o admin)
 */
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingsService.cancelBooking(req.params.id, req.user);
    return successResponse(res, 'Reserva cancelada exitosamente', { booking });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyBookings, createBooking, cancelBooking };
