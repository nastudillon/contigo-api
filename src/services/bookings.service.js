// Servicio de reservas: listado propio, creación, cancelación
const bookingsRepo = require('../repositories/bookings.repository');

/**
 * Obtiene las reservas del cliente autenticado.
 */
const getMyBookings = async (clientId) => {
  return bookingsRepo.findByClientId(clientId);
};

/**
 * Crea una nueva reserva para el cliente autenticado.
 * @param {number} clientId - ID del usuario autenticado
 * @param {object} body - { provider_id, date, time, duration_hours, notes, total_price }
 */
const createBooking = async (clientId, { provider_id, date, time, duration_hours, notes, total_price }) => {
  // Validaciones básicas
  if (!provider_id || !date || !time || !duration_hours || !total_price) {
    const err = new Error('Faltan campos requeridos: provider_id, date, time, duration_hours, total_price');
    err.statusCode = 400;
    throw err;
  }

  if (duration_hours < 1 || duration_hours > 4) {
    const err = new Error('La duración debe ser entre 1 y 4 horas');
    err.statusCode = 400;
    throw err;
  }

  const booking = await bookingsRepo.create({
    clientId,
    providerId: provider_id,
    date,
    time,
    durationHours: duration_hours,
    totalPrice: total_price,
    notes,
  });

  return booking;
};

/**
 * Cancela una reserva.
 * Solo puede cancelar el propio cliente o un admin.
 * @param {number} bookingId - ID de la reserva
 * @param {object} user - { id, role } del usuario autenticado
 */
const cancelBooking = async (bookingId, user) => {
  const booking = await bookingsRepo.findById(bookingId);

  if (!booking) {
    const err = new Error('Reserva no encontrada');
    err.statusCode = 404;
    throw err;
  }

  // Verificar permisos: solo el cliente dueño o un admin puede cancelar
  if (booking.client_id !== user.id && user.role !== 'admin') {
    const err = new Error('No tienes permiso para cancelar esta reserva');
    err.statusCode = 403;
    throw err;
  }

  if (booking.status === 'cancelled') {
    const err = new Error('La reserva ya está cancelada');
    err.statusCode = 400;
    throw err;
  }

  if (booking.status === 'completed') {
    const err = new Error('No se puede cancelar una reserva completada');
    err.statusCode = 400;
    throw err;
  }

  return bookingsRepo.cancel(bookingId, user.id);
};

module.exports = { getMyBookings, createBooking, cancelBooking };
