// Repositorio de usuarios: acceso directo a la tabla users (y elderly_contacts)
const pool = require('../db/pool');

const USER_PUBLIC_SELECT = `
  id,
  name,
  email,
  phone,
  rut,
  role,
  is_active,
  COALESCE(auth_provider, CASE WHEN google_sub IS NOT NULL THEN 'google' ELSE 'local' END) AS auth_provider,
  avatar_url,
  google_sub,
  COALESCE(status, CASE WHEN role IS NULL THEN 'ONBOARDING' ELSE 'ACTIVE' END) AS status,
  COALESCE(profile_completed, role IS NOT NULL) AS profile_completed,
  created_at,
  updated_at
`;

/**
 * Busca un usuario por email (incluye password_hash para verificación)
 */
const findByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
};

/**
 * Busca un usuario por id (sin password_hash)
 */
const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${USER_PUBLIC_SELECT}
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Busca un usuario por google_sub
 */
const findByGoogleSub = async (googleSub) => {
  const { rows } = await pool.query(
    `SELECT ${USER_PUBLIC_SELECT}
     FROM users WHERE google_sub = $1`,
    [googleSub]
  );
  return rows[0] || null;
};

/**
 * Crea un nuevo usuario con contraseña local.
 * Los registros tradicionales nacen activos y con perfil completo.
 */
const create = async ({ name, email, phone, passwordHash, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, auth_provider, is_active, status, profile_completed, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'local', true, 'ACTIVE', true, NOW(), NOW())
     RETURNING id`,
    [name, email, phone || null, passwordHash, role]
  );
  return findById(rows[0].id);
};

/**
 * Crea un usuario registrado vía Google (sin contraseña local).
 * Se guarda en estado ONBOARDING hasta que elija su tipo de perfil.
 */
const createFromGoogle = async ({ name, email, avatarUrl, googleSub, role = null }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, avatar_url, google_sub, role, auth_provider, is_active, status, profile_completed, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'google', true, 'ONBOARDING', false, NOW(), NOW())
     RETURNING id`,
    [name, email, avatarUrl || null, googleSub, role]
  );
  return findById(rows[0].id);
};

/**
 * Vincula una cuenta existente (registrada con email) a Google
 * y actualiza avatar si no tenía uno.
 */
const linkGoogleAccount = async (userId, googleSub, avatarUrl) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET google_sub = $1,
         auth_provider = 'google',
         avatar_url = COALESCE(avatar_url, $2),
         updated_at = NOW()
     WHERE id = $3
     RETURNING id`,
    [googleSub, avatarUrl || null, userId]
  );
  return rows[0] ? findById(rows[0].id) : null;
};

/**
 * Completa el onboarding del usuario con el rol elegido.
 */
const completeOnboarding = async ({ userId, role, status = 'ACTIVE' }) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET role = $1,
         status = $2,
         profile_completed = true,
         updated_at = NOW()
     WHERE id = $3
     RETURNING id`,
    [role, status, userId]
  );
  return rows[0] ? findById(rows[0].id) : null;
};

/**
 * Crea el registro de contacto de emergencia para adulto_mayor
 */
const createElderlyContact = async ({ userId, contactName, contactPhone, relation }) => {
  const { rows } = await pool.query(
    `INSERT INTO elderly_contacts (user_id, contact_name, contact_phone, relation)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, contactName, contactPhone, relation]
  );
  return rows[0];
};

/**
 * Actualiza campos editables del usuario (name, phone, rut)
 */
const updateFields = async (userId, { name, phone, rut } = {}) => {
  const setClauses = [];
  const params = [];
  let idx = 1;

  if (name  !== undefined) { setClauses.push(`name  = $${idx++}`); params.push(name); }
  if (phone !== undefined) { setClauses.push(`phone = $${idx++}`); params.push(phone); }
  if (rut   !== undefined) { setClauses.push(`rut   = $${idx++}`); params.push(rut); }

  if (setClauses.length === 0) return;

  setClauses.push(`updated_at = NOW()`);
  params.push(userId);

  await pool.query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${idx}`,
    params
  );
};

/**
 * Cuenta el total de usuarios
 */
const countAll = async () => {
  const { rows } = await pool.query('SELECT COUNT(*) as total FROM users');
  return parseInt(rows[0].total, 10);
};

module.exports = {
  findByEmail,
  findById,
  findByGoogleSub,
  create,
  createFromGoogle,
  linkGoogleAccount,
  completeOnboarding,
  createElderlyContact,
  updateFields,
  countAll,
};
