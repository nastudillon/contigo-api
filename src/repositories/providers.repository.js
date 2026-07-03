// Repositorio de prestadores: acceso a providers, provider_services, provider_conditions, availability_slots
const pool = require('../db/pool');

/**
 * Obtiene todos los prestadores aprobados con filtros opcionales
 * @param {object} filters - { category, location, search }
 */
const findAll = async ({ category, location, search } = {}) => {
  const conditions = [
    "p.validation_status = 'approved'",
    'p.is_verified = true',
  ];
  const params = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`c.slug = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  if (location) {
    conditions.push(`p.location ILIKE $${paramIndex}`);
    params.push(`%${location}%`);
    paramIndex++;
  }

  if (search) {
    conditions.push(`(u.name ILIKE $${paramIndex} OR p.bio ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT p.*,
           u.name, u.email, u.phone,
           c.slug AS category_slug, c.label AS category_label,
           c.color_bg, c.color_text,
           r.name AS region_name
    FROM providers p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN regions r ON p.region_id = r.id
    ${whereClause}
    ORDER BY p.is_featured DESC, p.rating_avg DESC
  `;

  const { rows } = await pool.query(query, params);
  return rows;
};

/**
 * Busca un prestador por su id con datos del usuario, categoría y región
 */
const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT p.*,
            u.name, u.email, u.phone,
            c.slug AS category_slug, c.label AS category_label,
            c.color_bg, c.color_text,
            r.name AS region_name
     FROM providers p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN regions r ON p.region_id = r.id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Busca un prestador por user_id (para el prestador autenticado)
 */
const findByUserId = async (userId) => {
  const { rows } = await pool.query(
    `SELECT p.*,
            c.slug AS category_slug, c.label AS category_label,
            r.name AS region_name
     FROM providers p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN regions r ON p.region_id = r.id
     WHERE p.user_id = $1`,
    [userId]
  );
  return rows[0] || null;
};

/**
 * Crea un nuevo prestador
 */
const create = async ({ userId, categoryId, regionId, location }) => {
  const { rows } = await pool.query(
    `INSERT INTO providers (user_id, category_id, region_id, location, validation_status, is_verified, is_featured, rating_avg, review_count, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'pending', false, false, 0, 0, NOW(), NOW())
     RETURNING *`,
    [userId, categoryId || null, regionId || null, location || null]
  );
  return rows[0];
};

/**
 * Actualiza los datos del perfil de un prestador (por user_id)
 * @param {number} userId - ID del usuario autenticado
 * @param {object} fields - Campos a actualizar
 */
const updateByUserId = async (userId, fields) => {
  // Construir SET dinámico solo con campos presentes
  const allowed = ['bio', 'hourly_rate', 'experience_years', 'location', 'avatar_url'];
  const setClauses = [];
  const params = [];
  let paramIndex = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setClauses.push(`${key} = $${paramIndex}`);
      params.push(fields[key]);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) return null;

  setClauses.push(`updated_at = NOW()`);
  params.push(userId);

  const { rows } = await pool.query(
    `UPDATE providers SET ${setClauses.join(', ')} WHERE user_id = $${paramIndex} RETURNING *`,
    params
  );
  return rows[0] || null;
};

/**
 * Actualiza el estado de validación de un prestador (uso admin)
 */
const updateValidationStatus = async (id, action) => {
  const validationStatus = action === 'approve' ? 'approved' : 'rejected';
  const isVerified = action === 'approve';

  const { rows } = await pool.query(
    `UPDATE providers SET validation_status = $1, is_verified = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [validationStatus, isVerified, id]
  );
  return rows[0] || null;
};

/**
 * Obtiene los servicios de un prestador
 */
const findServicesByProviderId = async (providerId) => {
  const { rows } = await pool.query(
    'SELECT * FROM provider_services WHERE provider_id = $1',
    [providerId]
  );
  return rows;
};

/**
 * Obtiene las condiciones de un prestador
 */
const findConditionsByProviderId = async (providerId) => {
  const { rows } = await pool.query(
    'SELECT * FROM provider_conditions WHERE provider_id = $1',
    [providerId]
  );
  return rows;
};

/**
 * Obtiene los slots de disponibilidad semanal de un prestador para un día específico
 * @param {number} providerId
 * @param {number} dayOfWeek - 0=Lunes, 6=Domingo
 */
const findAvailabilitySlots = async (providerId, dayOfWeek) => {
  const { rows } = await pool.query(
    `SELECT * FROM availability_slots
     WHERE provider_id = $1 AND day_of_week = $2 AND is_available = true`,
    [providerId, dayOfWeek]
  );
  return rows;
};

/**
 * Busca una categoría por su slug
 */
const findCategoryBySlug = async (slug) => {
  const { rows } = await pool.query(
    'SELECT * FROM categories WHERE slug = $1',
    [slug]
  );
  return rows[0] || null;
};

/**
 * Obtiene todos los prestadores para el panel de administración
 */
const findAllForAdmin = async () => {
  const { rows } = await pool.query(
    `SELECT p.*, u.name, u.email, c.label AS category_label
     FROM providers p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN categories c ON p.category_id = c.id
     ORDER BY p.created_at DESC`
  );
  return rows;
};

/**
 * Cuenta estadísticas de prestadores
 */
const countStats = async () => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE validation_status = 'approved') AS approved,
       COUNT(*) FILTER (WHERE validation_status = 'pending') AS pending
     FROM providers`
  );
  return rows[0];
};

module.exports = {
  findAll,
  findById,
  findByUserId,
  create,
  updateByUserId,
  updateValidationStatus,
  findServicesByProviderId,
  findConditionsByProviderId,
  findAvailabilitySlots,
  findCategoryBySlug,
  findAllForAdmin,
  countStats,
};
