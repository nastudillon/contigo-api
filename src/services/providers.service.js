// Servicio de prestadores: listado, detalle, disponibilidad, perfil propio, reservas del prestador
const providersRepo = require('../repositories/providers.repository');
const bookingsRepo = require('../repositories/bookings.repository');
const reviewsRepo = require('../repositories/reviews.repository');
const usersRepo = require('../repositories/users.repository');

function mapSpecialties(rows = []) {
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.specialty_id)) {
      grouped.set(row.specialty_id, {
        id: row.specialty_id,
        categoryId: row.category_id,
        slug: row.specialty_slug,
        name: row.specialty_label,
        icon: row.specialty_icon || '',
        active: row.is_active,
        services: [],
      });
    }

    if (row.service_id) {
      grouped.get(row.specialty_id).services.push({
        id: row.service_id,
        name: row.service_name,
        description: row.description,
        price: row.price,
      });
    }
  }

  return [...grouped.values()];
}


function mapSpecialtySummaries(rows = []) {
  return rows.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    label: row.label,
    icon: row.icon || '',
    active: row.is_active !== false,
  }));
}

const PERIOD_TIME_BY_KEY = {
  manana: { startTime: '08:00:00', endTime: '13:00:00' },
  tarde: { startTime: '14:00:00', endTime: '19:00:00' },
  noche: { startTime: '19:00:00', endTime: '22:00:00' },
};

function inferPeriodKey(row = {}) {
  if (row.period_key) return row.period_key;

  const startTime = String(row.start_time || '');
  if (startTime.startsWith('08:00')) return 'manana';
  if (startTime.startsWith('14:00')) return 'tarde';
  if (startTime.startsWith('19:00')) return 'noche';
  return 'manana';
}

function mapAvailability(rows = []) {
  return rows.map((row) => {
    const periodKey = inferPeriodKey(row);
    const defaults = PERIOD_TIME_BY_KEY[periodKey] || PERIOD_TIME_BY_KEY.manana;

    return {
      id: row.id,
      dayOfWeek: row.day_of_week,
      periodKey,
      startTime: row.start_time || defaults.startTime,
      endTime: row.end_time || defaults.endTime,
      serviceMode: row.service_mode === 'consulta' ? 'consulta' : 'domicilio',
      isAvailable: row.is_available !== false,
    };
  });
}

const DAY_LABELS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

function summarizeNextAvailability(rows = []) {
  const slots = mapAvailability(rows).filter((slot) => slot.isAvailable !== false);
  if (slots.length === 0) return null;

  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;

  const nextDays = [...new Set(slots.map((slot) => slot.dayOfWeek))].sort((a, b) => a - b);

  if (nextDays.includes(todayIndex)) return 'hoy';
  if (nextDays.includes((todayIndex + 1) % 7)) return 'mañana';

  let bestDay = nextDays[0];
  let bestDistance = 7;

  for (const dayIndex of nextDays) {
    const distance = (dayIndex - todayIndex + 7) % 7;
    if (distance > 0 && distance < bestDistance) {
      bestDistance = distance;
      bestDay = dayIndex;
    }
  }

  return DAY_LABELS[bestDay] || null;
}

/**
 * Obtiene el listado de prestadores aprobados con filtros opcionales.
 */
const getProviders = async (filters) => {
  const providers = await providersRepo.findAll(filters);

  return Promise.all(
    providers.map(async (provider) => {
      const [conditions, availabilityRows, specialtyRows] = await Promise.all([
        providersRepo.findConditionsByProviderId(provider.id),
        providersRepo.findWeeklyAvailabilityByProviderId(provider.id),
        providersRepo.findSpecialtiesByProviderId(provider.id),
      ]);

      return {
        ...provider,
        conditions,
        specialties: mapSpecialtySummaries(specialtyRows),
        avail: summarizeNextAvailability(availabilityRows),
      };
    })
  );
};

/**
 * Obtiene el detalle completo de un prestador:
 * datos base + servicios + certificaciones + últimas reseñas.
 */
const getProviderById = async (id) => {
  const provider = await providersRepo.findById(id);
  if (!provider) {
    const err = new Error('Prestador no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const [serviceRows, conditions, reviews] = await Promise.all([
    providersRepo.findServicesByProviderId(id),
    providersRepo.findConditionsByProviderId(id),
    reviewsRepo.findByProviderId(id),
  ]);

  const specialties = mapSpecialties(serviceRows);
  const services = serviceRows
    .filter(row => row.service_name)
    .map(row => row.service_name);

  return { ...provider, services, specialties, conditions, reviews };
};

/**
 * Calcula la disponibilidad horaria de un prestador en una fecha dada.
 */
const getAvailability = async (providerId, date) => {
  const provider = await providersRepo.findById(providerId);
  if (!provider) {
    const err = new Error('Prestador no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const dateObj = new Date(date + 'T00:00:00');
  const dayOfWeek = (dateObj.getDay() + 6) % 7;
  const slots = await providersRepo.findAvailabilitySlots(providerId, dayOfWeek);

  if (slots.length === 0) return [];

  const bookedHours = await bookingsRepo.findBookedHoursOnDate(providerId, date);
  const bookedSet = new Set(bookedHours.map((t) => t.substring(0, 5)));
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

  return [...new Set(availableHours)].sort();
};

/**
 * Devuelve (o crea si no existe) el perfil del prestador autenticado.
 */
const getMyProfile = async (userId) => {
  let provider = await providersRepo.findByUserId(userId);

  if (!provider) {
    provider = await providersRepo.create({ userId });
  }

  const [conditions, user, serviceRows, availabilityRows, coverage] = await Promise.all([
    providersRepo.findConditionsByProviderId(provider.id),
    usersRepo.findById(userId),
    providersRepo.findServicesByProviderId(provider.id),
    providersRepo.findWeeklyAvailabilityByProviderId(provider.id),
    providersRepo.findCoverageByProviderId(provider.id),
  ]);

  return {
    ...provider,
    name:                 user?.name,
    phone:                user?.phone,
    email:                user?.email,
    rut:                  user?.rut,
    consultation_address: provider?.consultation_address || '',
    certifications:       conditions,
    specialties:          mapSpecialties(serviceRows),
    availability:         mapAvailability(availabilityRows),
    coverage,
  };
};

/**
 * Actualiza el perfil del prestador autenticado.
 */
const updateMyProfile = async (userId, fields) => {
  let provider = await providersRepo.findByUserId(userId);

  if (!provider) {
    provider = await providersRepo.create({ userId });
  }

  const userFields = {};
  if (fields.name !== undefined) userFields.name = fields.name;
  if (fields.phone !== undefined) userFields.phone = fields.phone;
  if (fields.rut !== undefined) userFields.rut = fields.rut;
  if (Object.keys(userFields).length > 0) {
    await usersRepo.updateFields(userId, userFields);
  }

  const providerFields = {};
  ['bio', 'hourly_rate', 'experience_years', 'avatar_url', 'consultation_address'].forEach((key) => {
    if (fields[key] !== undefined) providerFields[key] = fields[key];
  });
  if (Object.keys(providerFields).length > 0) {
    await providersRepo.updateByUserId(userId, providerFields);
  }

  if (Array.isArray(fields.certificationIds)) {
    await providersRepo.replaceConditions(provider.id, fields.certificationIds);
  }

  if (Array.isArray(fields.communeIds)) {
    await providersRepo.replaceCoverage(provider.id, fields.communeIds);
  }

  if (Array.isArray(fields.specialties)) {
    await providersRepo.replaceSpecialties(provider.id, fields.specialties);

    const hasAnySpecialty = fields.specialties.some((specialty) => Number.isInteger(Number(specialty?.categoryId)));
    if (hasAnySpecialty) {
      await providersRepo.autoApproveById(provider.id);
    }
  }

  if (Array.isArray(fields.availability)) {
    await providersRepo.replaceAvailability(provider.id, fields.availability);
  }

  return getMyProfile(userId);
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

/**
 * Devuelve el catálogo completo de certificaciones.
 */
const getCertifications = async () => {
  return providersRepo.findAllCertifications();
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
