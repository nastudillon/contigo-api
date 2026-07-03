// Servicio de prestadores: listado, detalle, disponibilidad, perfil propio, reservas del prestador
const providersRepo = require('../repositories/providers.repository');
const bookingsRepo = require('../repositories/bookings.repository');
const reviewsRepo = require('../repositories/reviews.repository');

/**
 * Obtiene el listado de prestadores aprobados con filtros opcionales.
 */
const getProviders = async (filters) => {
  return providersRepo.findAll(filters);
};

/**
 * Obtiene el detalle completo de un prestador:
 * datos base + servicios + condiciones + últimas 10 reseñas
 */
const getProviderById = async (id) => {
  const provider = await providersRepo.findById(id);
  if (!provider) {
    const err = new Error('Prestador no encontrado');
    err.statusCode = 404;
    throw err;
  }

  // Queries paralelas para eficiencia
  const [services, conditions, reviews] = await Promise.all([
    providersRepo.findServicesByProviderId(id),
    providersRepo.findConditionsByProviderId(id),
    reviewsRepo.findByProviderId(id),
  ]);

  return { ...provider, services, conditions, reviews };
};

/**
 * Calcula la disponibilidad horaria de un prestador en una fecha dada.
 * Retorna array de strings ["09:00", "10:00", ...]
 * @param {number} providerId
 * @param {string} date - Formato YYYY-MM-DD
 */
const getAvailability = async (providerId, date) => {
  // Verificar que el prestador existe
  const provider = await providersRepo.findById(providerId);
  if (!provider) {
    const err = new Error('Prestador no encontrado');
    err.statusCode = 404;
    throw err;
  }

  // Calcular día de la semana: 0=Lunes, 6=Domingo
  // Date.getDay() devuelve 0=Domingo, 1=Lunes ... 6=Sábado
  // Convertimos: (getDay() + 6) % 7 → 0=Lunes, 6=Domingo
  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = (dateObj.getDay() + 6) % 7;

  // Obtener slots configurados para ese día
  const slots = await providersRepo.findAvailabilitySlots(providerId, dayOfWeek);

  if (slots.length === 0) return [];

  // Obtener horas ya ocupadas en esa fecha
  const bookedHours = await bookingsRepo.findBookedHoursOnDate(providerId, date);
  // Normalizar a formato "HH:MM"
  const bookedSet = new Set(
    bookedHours.map((t) => t.substring(0, 5))
  );

  // Generar lista de horas disponibles por cada slot
  const availableHours = [];

  for (const slot of slots) {
    const startHour = parseInt(slot.start_time.substring(0, 2), 10);
    const endHour = parseInt(slot.end_time.substring(0, 2), 10);

    for (let h = startHour; h < endHour; h++) {
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      if (!bookedSet.has(hourStr)) {
        availableHours.push(hourStr);
      }
    }
  }

  // Ordenar y deduplicar
  const unique = [...new Set(availableHours)].sort();
  return unique;
};

/**
 * Actualiza el perfil del prestador autenticado.
 */
const updateMyProfile = async (userId, fields) => {
  const updated = await providersRepo.updateByUserId(userId, fields);
  if (!updated) {
    const err = new Error('Perfil de prestador no encontrado');
    err.statusCode = 404;
    throw err;
  }
  return updated;
};

/**
 * Obtiene las reservas del prestador autenticado.
 */
const getMyBookings = async (userId) => {
  const provider = await providersRepo.findByUserId(userId);
  if (!provider) {
    const err = new Error('Perfil de prestador no encontrado');
    err.statusCode = 404;
    throw err;
  }
  return bookingsRepo.findByProviderId(provider.id);
};

module.exports = {
  getProviders,
  getProviderById,
  getAvailability,
  updateMyProfile,
  getMyBookings,
};
