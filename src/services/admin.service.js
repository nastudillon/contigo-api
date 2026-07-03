// Servicio de administración: gestión de prestadores, reservas y estadísticas
const providersRepo = require('../repositories/providers.repository');
const bookingsRepo = require('../repositories/bookings.repository');
const usersRepo = require('../repositories/users.repository');

/**
 * Obtiene todos los prestadores para el panel de administración.
 */
const getAllProviders = async () => {
  return providersRepo.findAllForAdmin();
};

/**
 * Aprueba o rechaza un prestador.
 * @param {number} providerId
 * @param {string} action - 'approve' o 'reject'
 */
const validateProvider = async (providerId, action) => {
  if (!['approve', 'reject'].includes(action)) {
    const err = new Error("La acción debe ser 'approve' o 'reject'");
    err.statusCode = 400;
    throw err;
  }

  const updated = await providersRepo.updateValidationStatus(providerId, action);
  if (!updated) {
    const err = new Error('Prestador no encontrado');
    err.statusCode = 404;
    throw err;
  }

  return updated;
};

/**
 * Obtiene todas las reservas para el panel de administración.
 */
const getAllBookings = async () => {
  return bookingsRepo.findAllForAdmin();
};

/**
 * Obtiene estadísticas generales del sistema.
 */
const getStats = async () => {
  // Ejecutar todos los conteos en paralelo
  const [userCount, providerStats, bookingStats] = await Promise.all([
    usersRepo.countAll(),
    providersRepo.countStats(),
    bookingsRepo.countStats(),
  ]);

  return {
    total_users: userCount,
    total_providers: parseInt(providerStats.total, 10),
    total_providers_approved: parseInt(providerStats.approved, 10),
    total_providers_pending: parseInt(providerStats.pending, 10),
    total_bookings: parseInt(bookingStats.total, 10),
    total_bookings_pending: parseInt(bookingStats.pending, 10),
    total_bookings_confirmed: parseInt(bookingStats.confirmed, 10),
    total_bookings_completed: parseInt(bookingStats.completed, 10),
  };
};

module.exports = { getAllProviders, validateProvider, getAllBookings, getStats };
