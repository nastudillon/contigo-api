// Repositorio de prestadores: acceso a providers, provider_services, provider_specialties, provider_certifications y disponibilidad
const pool = require('../db/pool');

let availabilitySlotsColumnsPromise = null;

const getAvailabilitySlotsColumns = async () => {
  if (!availabilitySlotsColumnsPromise) {
    availabilitySlotsColumnsPromise = pool
      .query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = CURRENT_SCHEMA()
           AND table_name = 'availability_slots'`
      )
      .then(({ rows }) => new Set(rows.map((row) => row.column_name)))
      .catch((error) => {
        availabilitySlotsColumnsPromise = null;
        throw error;
      });
  }

  return availabilitySlotsColumnsPromise;
};

/**
 * Obtiene todos los prestadores aprobados con filtros opcionales
 * @param {object} filters - { category, location, search }
 */
const findAll = async ({ category, location, search, sort } = {}) => {
  const conditions = [
    "p.validation_status = 'approved'",
    'p.is_verified = true',
    `(
      p.category_id IS NOT NULL OR EXISTS (
        SELECT 1
        FROM provider_specialties ps_visible
        WHERE ps_visible.provider_id = p.id
          AND ps_visible.is_active = true
      )
    )`,
  ];
  const params = [];
  let paramIndex = 1;

  if (category) {
    conditions.push(`(
      c.slug = $${paramIndex}
      OR EXISTS (
        SELECT 1
        FROM provider_specialties ps_filter
        JOIN categories c_filter ON c_filter.id = ps_filter.category_id
        WHERE ps_filter.provider_id = p.id
          AND ps_filter.is_active = true
          AND c_filter.slug = $${paramIndex}
      )
    )`);
    params.push(category);
    paramIndex++;
  }

  if (location) {
    conditions.push(`p.location ILIKE $${paramIndex}`);
    params.push(`%${location}%`);
    paramIndex++;
  }

  if (search) {
    conditions.push(`(
      u.name ILIKE $${paramIndex}
      OR p.bio ILIKE $${paramIndex}
      OR c.label ILIKE $${paramIndex}
      OR p.location ILIKE $${paramIndex}
      OR EXISTS (
        SELECT 1
        FROM provider_specialties ps_search
        JOIN categories c_search ON c_search.id = ps_search.category_id
        WHERE ps_search.provider_id = p.id
          AND ps_search.is_active = true
          AND (
            c_search.label ILIKE $${paramIndex}
            OR c_search.slug ILIKE $${paramIndex}
          )
      )
      OR EXISTS (
        SELECT 1
        FROM provider_specialties ps_service
        JOIN provider_services s_search ON s_search.provider_specialty_id = ps_service.id
        WHERE ps_service.provider_id = p.id
          AND ps_service.is_active = true
          AND (
            COALESCE(s_search.name, '') ILIKE $${paramIndex}
            OR COALESCE(s_search.description, '') ILIKE $${paramIndex}
          )
      )
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const orderByClause = {
    rating_desc: 'p.rating_avg DESC, p.review_count DESC, u.name ASC',
    price_asc: 'p.hourly_rate ASC NULLS LAST, p.rating_avg DESC, u.name ASC',
    experience_desc: 'p.experience_years DESC NULLS LAST, p.rating_avg DESC, u.name ASC',
  }[sort] || 'p.is_featured DESC, p.rating_avg DESC, p.review_count DESC, u.name ASC';

  const query = `
    SELECT p.*,
           u.name, u.email, u.phone,
           c.slug AS category_slug, c.label AS category_label, c.icon AS category_icon,
           c.color_bg, c.color_text,
           r.name AS region_name
    FROM providers p
    JOIN users u ON p.user_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN regions r ON p.region_id = r.id
    ${whereClause}
    ORDER BY ${orderByClause}
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
            c.slug AS category_slug, c.label AS category_label, c.icon AS category_icon,
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
            c.slug AS category_slug, c.label AS category_label, c.icon AS category_icon,
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
 */
const updateByUserId = async (userId, fields) => {
  const allowed = ['bio', 'hourly_rate', 'experience_years', 'location', 'avatar_url', 'category_id', 'consultation_address'];
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
 * Aprueba automaticamente un prestador para el flujo de desarrollo/demo.
 */
const autoApproveById = async (id) => {
  const { rows } = await pool.query(
    `UPDATE providers
     SET validation_status = 'approved',
         is_verified = true,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Obtiene el detalle de servicios agrupables para un prestador.
 */
const findServicesByProviderId = async (providerId) => {
  const { rows } = await pool.query(
    `SELECT ps.id AS specialty_id,
            ps.category_id,
            ps.is_active,
            c.slug AS specialty_slug,
            c.label AS specialty_label,
            c.icon AS specialty_icon,
            s.id AS service_id,
            COALESCE(s.name, s.description) AS service_name,
            s.description,
            s.price
     FROM provider_specialties ps
     JOIN categories c ON c.id = ps.category_id
     LEFT JOIN provider_services s ON s.provider_specialty_id = ps.id
     WHERE ps.provider_id = $1
     ORDER BY c.label, s.id`,
    [providerId]
  );
  return rows;
};

/**
 * Obtiene las comunas de cobertura de un prestador (via provider_coverage)
 */
const findCoverageByProviderId = async (providerId) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, r.id AS region_id, r.name AS region_name
     FROM provider_coverage pc
     JOIN communes c ON c.id = pc.commune_id
     JOIN regions r ON r.id = c.region_id
     WHERE pc.provider_id = $1
     ORDER BY r.name, c.name`,
    [providerId]
  );
  return rows;
};

/**
 * Reemplaza las comunas de cobertura de un prestador (operación atómica).
 * Sincroniza providers.location para compatibilidad con búsquedas.
 */
const replaceCoverage = async (providerId, communeIds = []) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM provider_coverage WHERE provider_id = $1', [providerId]);
    for (const communeId of communeIds) {
      await client.query(
        'INSERT INTO provider_coverage (provider_id, commune_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [providerId, communeId]
      );
    }
    if (communeIds.length > 0) {
      const { rows } = await client.query(
        'SELECT name FROM communes WHERE id = ANY($1::int[]) ORDER BY name',
        [communeIds]
      );
      await client.query(
        'UPDATE providers SET location = $1, updated_at = NOW() WHERE id = $2',
        [rows.map(r => r.name).join(', '), providerId]
      );
    } else {
      await client.query(
        'UPDATE providers SET location = NULL, updated_at = NOW() WHERE id = $1',
        [providerId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Obtiene las certificaciones de un prestador (via tabla pivote)
 */
const findConditionsByProviderId = async (providerId) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.label, c.icon
     FROM provider_certifications pc
     JOIN certifications c ON c.id = pc.certification_id
     WHERE pc.provider_id = $1
     ORDER BY c.label`,
    [providerId]
  );
  return rows;
};

/**
 * Obtiene los slots de disponibilidad semanal de un prestador para un día específico
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
 * Obtiene la configuración semanal completa de disponibilidad de un prestador.
 */
const findWeeklyAvailabilityByProviderId = async (providerId) => {
  const columns = await getAvailabilitySlotsColumns();
  const periodKeySelect = columns.has('period_key')
    ? 'period_key'
    : "NULL::VARCHAR(20) AS period_key";
  const serviceModeSelect = columns.has('service_mode')
    ? 'service_mode'
    : "'domicilio'::VARCHAR(20) AS service_mode";
  const isAvailableSelect = columns.has('is_available')
    ? 'is_available'
    : 'TRUE AS is_available';

  const { rows } = await pool.query(
    `SELECT id,
            provider_id,
            day_of_week,
            ${periodKeySelect},
            start_time,
            end_time,
            ${serviceModeSelect},
            ${isAvailableSelect}
     FROM availability_slots
     WHERE provider_id = $1
     ORDER BY day_of_week, start_time`,
    [providerId]
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
 * Reemplaza las certificaciones de un prestador (operación atómica).
 */
const replaceConditions = async (providerId, certificationIds = []) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM provider_certifications WHERE provider_id = $1', [providerId]);
    for (const certId of certificationIds) {
      await client.query(
        'INSERT INTO provider_certifications (provider_id, certification_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [providerId, certId]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Reemplaza completamente las especialidades y servicios del prestador.
 * Mantiene sincronizada la categoría principal en providers.category_id.
 */
const replaceSpecialties = async (providerId, specialties = []) => {
  const client = await pool.connect();
  const normalized = specialties
    .filter((item) => Number.isInteger(Number(item.categoryId)))
    .map((item) => ({
      categoryId: Number(item.categoryId),
      active: item.active !== false,
      services: Array.isArray(item.services) ? item.services : [],
    }));

  const primaryCategoryId = normalized.find(item => item.active)?.categoryId ?? normalized[0]?.categoryId ?? null;

  try {
    await client.query('BEGIN');

    await client.query(
      `DELETE FROM provider_services
       WHERE provider_specialty_id IN (
         SELECT id FROM provider_specialties WHERE provider_id = $1
       )`,
      [providerId]
    );
    await client.query('DELETE FROM provider_specialties WHERE provider_id = $1', [providerId]);

    for (const specialty of normalized) {
      const insertSpecialty = await client.query(
        `INSERT INTO provider_specialties (provider_id, category_id, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [providerId, specialty.categoryId, specialty.active]
      );

      const specialtyId = insertSpecialty.rows[0].id;

      for (const service of specialty.services) {
        const name = String(service.name || '').trim();
        const description = String(service.description || service.desc || '').trim();
        const priceRaw = String(service.price ?? '').replace(/[^0-9]/g, '');
        const price = priceRaw ? Number(priceRaw) : 0;

        if (!name && !description && !price) continue;

        await client.query(
          `INSERT INTO provider_services (provider_id, provider_specialty_id, name, description, price)
           VALUES ($1, $2, $3, $4, $5)`,
          [providerId, specialtyId, name || description, description || name, price]
        );
      }
    }

    await client.query(
      `UPDATE providers
       SET category_id = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [primaryCategoryId, providerId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Reemplaza la configuración semanal de disponibilidad del prestador.
 */
const replaceAvailability = async (providerId, availability = []) => {
  const client = await pool.connect();
  const columns = await getAvailabilitySlotsColumns();
  const normalized = availability
    .filter((slot) => Number.isInteger(Number(slot.dayOfWeek)) && slot.periodKey && slot.startTime && slot.endTime)
    .map((slot) => ({
      dayOfWeek: Number(slot.dayOfWeek),
      periodKey: String(slot.periodKey),
      startTime: String(slot.startTime),
      endTime: String(slot.endTime),
      serviceMode: slot.serviceMode === 'consulta' ? 'consulta' : 'domicilio',
      isAvailable: slot.isAvailable !== false,
    }));

  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM availability_slots WHERE provider_id = $1', [providerId]);

    for (const slot of normalized) {
      const insertColumns = ['provider_id', 'day_of_week', 'start_time', 'end_time'];
      const insertValues = [providerId, slot.dayOfWeek, slot.startTime, slot.endTime];

      if (columns.has('period_key')) {
        insertColumns.push('period_key');
        insertValues.push(slot.periodKey);
      }
      if (columns.has('service_mode')) {
        insertColumns.push('service_mode');
        insertValues.push(slot.serviceMode);
      }
      if (columns.has('is_available')) {
        insertColumns.push('is_available');
        insertValues.push(slot.isAvailable);
      }
      if (columns.has('created_at')) {
        insertColumns.push('created_at');
      }
      if (columns.has('updated_at')) {
        insertColumns.push('updated_at');
      }

      const valuePlaceholders = [];
      let paramIndex = 1;
      for (const column of insertColumns) {
        if (column === 'created_at' || column === 'updated_at') {
          valuePlaceholders.push('NOW()');
        } else {
          valuePlaceholders.push(`$${paramIndex}`);
          paramIndex += 1;
        }
      }

      await client.query(
        `INSERT INTO availability_slots (${insertColumns.join(', ')})
         VALUES (${valuePlaceholders.join(', ')})`,
        insertValues
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Obtiene el catálogo completo de certificaciones disponibles
 */
const findAllCertifications = async () => {
  const { rows } = await pool.query(
    'SELECT id, label, icon FROM certifications ORDER BY label'
  );
  return rows;
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
  autoApproveById,
  findServicesByProviderId,
  findConditionsByProviderId,
  replaceConditions,
  findCoverageByProviderId,
  replaceCoverage,
  replaceSpecialties,
  findWeeklyAvailabilityByProviderId,
  replaceAvailability,
  findAllCertifications,
  findAvailabilitySlots,
  findCategoryBySlug,
  findAllForAdmin,
  countStats,
};
