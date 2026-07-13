// Servicio de reservas: listado propio, creación, cancelación
const bookingsRepo  = require('../repositories/bookings.repository');
const elderlyRepo   = require('../repositories/elderly.repository');

/**
 * Obtiene las reservas del cliente autenticado.
 */
const getMyBookings = async (clientId) => {
  return bookingsRepo.findByClientId(clientId);
};

/**
 * Crea una nueva reserva para el cliente autenticado.
 * @param {number} clientId - ID del usuario autenticado
 * @param {object} body - { provider_id, date, time, duration_hours, notes, total_price, elderly_id }
 * @param {string} userRole - rol del usuario autenticado
 */
const createBooking = async (clientId, { provider_id, date, time, duration_hours, notes, total_price, elderly_id }, userRole) => {
  if (!provider_id || !date || !time || !duration_hours || total_price === undefined || total_price === null) {
    const err = new Error('Faltan campos requeridos: provider_id, date, time, duration_hours, total_price');
    err.statusCode = 400;
    throw err;
  }

  if (Number(duration_hours) !== 1) {
    const err = new Error('Por ahora las reservas deben ser de 1 hora exacta.');
    err.statusCode = 400;
    throw err;
  }

  const cleanNotes = typeof notes === 'string' ? notes.trim() : '';
  if (cleanNotes.length > 200) {
    const err = new Error('Las notas adicionales no pueden superar 200 caracteres.');
    err.statusCode = 400;
    throw err;
  }

  // Familiar debe indicar para quién es la reserva
  if (userRole === 'familiar' && !elderly_id) {
    const err = new Error('Debes seleccionar la persona para quien realizas la reserva.');
    err.statusCode = 400;
    throw err;
  }

  // Validar que el adulto mayor pertenezca al cliente autenticado
  let resolvedElderlyId = null;
  if (elderly_id) {
    const elderlyList = await elderlyRepo.findByUserId(clientId);
    const match = elderlyList.find(ep => ep.id === Number(elderly_id));
    if (!match) {
      const err = new Error('La persona seleccionada no pertenece a tu cuenta.');
      err.statusCode = 403;
      throw err;
    }
    resolvedElderlyId = match.id;
  }

  const booking = await bookingsRepo.create({
    clientId,
    providerId: provider_id,
    date,
    time,
    durationHours: 1,
    totalPrice: total_price,
    notes: cleanNotes,
    elderlyId: resolvedElderlyId,
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

/**
 * Confirma una reserva.
 * Solo puede confirmar el prestador al que pertenece la reserva.
 * @param {number} bookingId
 * @param {object} user - { id, role } del usuario autenticado
 */
const confirmBooking = async (bookingId, user) => {
  const booking = await bookingsRepo.findById(bookingId);

  if (!booking) {
    const err = new Error('Reserva no encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (booking.status !== 'pending') {
    const err = new Error('Solo se pueden confirmar reservas en estado pendiente');
    err.statusCode = 400;
    throw err;
  }

  // Verificar que el prestador autenticado es dueño de la reserva
  const providersRepo = require('../repositories/providers.repository');
  const provider = await providersRepo.findByUserId(user.id);
  if (!provider || provider.id !== booking.provider_id) {
    const err = new Error('No tienes permiso para confirmar esta reserva');
    err.statusCode = 403;
    throw err;
  }

  return bookingsRepo.confirm(bookingId);
};

/**
 * Marca una reserva como completada.
 * Solo puede hacerlo el prestador dueño de la reserva.
 */
const completeBooking = async (bookingId, user) => {
  const booking = await bookingsRepo.findById(bookingId);

  if (!booking) {
    const err = new Error('Reserva no encontrada');
    err.statusCode = 404;
    throw err;
  }

  if (booking.status === 'cancelled') {
    const err = new Error('No se puede completar una reserva cancelada');
    err.statusCode = 400;
    throw err;
  }

  if (booking.status === 'completed') {
    const err = new Error('La reserva ya está completada');
    err.statusCode = 400;
    throw err;
  }

  const providersRepo = require('../repositories/providers.repository');
  const provider = await providersRepo.findByUserId(user.id);
  if (!provider || provider.id !== booking.provider_id) {
    const err = new Error('No tienes permiso para completar esta reserva');
    err.statusCode = 403;
    throw err;
  }

  return bookingsRepo.complete(bookingId);
};

module.exports = { getMyBookings, createBooking, cancelBooking, confirmBooking, completeBooking };
