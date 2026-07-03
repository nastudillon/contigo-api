// Repositorio de reseñas: acceso a la tabla reviews
const pool = require('../db/pool');

/**
 * Obtiene las últimas 10 reseñas de un prestador, con nombre del autor
 */
const findByProviderId = async (providerId) => {
  const { rows } = await pool.query(
    `SELECT r.*, u.name AS author_name
     FROM reviews r
     JOIN users u ON r.client_id = u.id
     WHERE r.provider_id = $1
     ORDER BY r.created_at DESC
     LIMIT 10`,
    [providerId]
  );
  return rows;
};

/**
 * Crea una nueva reseña
 */
const create = async ({ providerId, clientId, bookingId, rating, comment }) => {
  const { rows } = await pool.query(
    `INSERT INTO reviews (provider_id, client_id, booking_id, rating, comment, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [providerId, clientId, bookingId, rating, comment || null]
  );
  return rows[0];
};

module.exports = {
  findByProviderId,
  create,
};
