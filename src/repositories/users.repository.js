// Repositorio de usuarios: acceso directo a la tabla users (y elderly_contacts)
const pool = require('../db/pool');

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
    `SELECT id, name, email, phone, role, is_active, auth_provider, avatar_url, created_at, updated_at
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
    `SELECT id, name, email, phone, role, is_active, auth_provider, avatar_url, google_sub, created_at, updated_at
     FROM users WHERE google_sub = $1`,
    [googleSub]
  );
  return rows[0] || null;
};

/**
 * Crea un nuevo usuario con contraseña local
 * @returns {object} Usuario creado (sin password_hash)
 */
const create = async ({ name, email, phone, passwordHash, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, phone, password_hash, role, auth_provider, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'local', true, NOW(), NOW())
     RETURNING id, name, email, phone, role, auth_provider, avatar_url, is_active, created_at, updated_at`,
    [name, email, phone || null, passwordHash, role]
  );
  return rows[0];
};

/**
 * Crea un usuario registrado vía Google (sin contraseña local)
 */
const createFromGoogle = async ({ name, email, avatarUrl, googleSub, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, avatar_url, google_sub, role, auth_provider, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'google', true, NOW(), NOW())
     RETURNING id, name, email, phone, role, auth_provider, avatar_url, is_active, created_at, updated_at`,
    [name, email, avatarUrl || null, googleSub, role]
  );
  return rows[0];
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
     RETURNING id, name, email, phone, role, auth_provider, avatar_url, is_active, created_at, updated_at`,
    [googleSub, avatarUrl || null, userId]
  );
  return rows[0];
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
  createElderlyContact,
  countAll,
};
