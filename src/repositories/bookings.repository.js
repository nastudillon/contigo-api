// Repositorio de reservas: acceso directo a la tabla bookings
const pool = require('../db/pool');

/**
 * Obtiene todas las reservas de un cliente (usuario autenticado)
 * Incluye nombre del prestador y categoría
 */
const findByClientId = async (clientId) => {
  const { rows } = await pool.query(
    `SELECT b.*,
            u.name AS provider_name,
            c.label AS category_label
     FROM bookings b
     JOIN providers p ON b.provider_id = p.id
     JOIN users u ON p.user_id = u.id
     LEFT JOIN categories c ON p.category_id = c.id
     WHERE b.client_id = $1
     ORDER BY b.date DESC, b.time DESC`,
    [clientId]
  );
  return rows;
};

/**
 * Obtiene todas las reservas asignadas a un prestador
 * Incluye datos del cliente
 */
const findByProviderId = async (providerId) => {
  const { rows } = await pool.query(
    `SELECT b.*,
            u.name AS client_name,
            u.email AS client_email,
            u.phone AS client_phone
     FROM bookings b
     JOIN users u ON b.client_id = u.id
     WHERE b.provider_id = $1
     ORDER BY b.date DESC, b.time DESC`,
    [providerId]
  );
  return rows;
};

/**
 * Busca una reserva por su id
 */
const findById = async (id) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE id = $1',
    [id]
  );
  return rows[0] || null;
};

/**
 * Crea una nueva reserva
 */
const create = async ({ clientId, providerId, date, time, durationHours, totalPrice, notes }) => {
  const { rows } = await pool.query(
    `INSERT INTO bookings (client_id, provider_id, date, time, duration_hours, total_price, notes, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
     RETURNING *`,
    [clientId, providerId, date, time, durationHours, totalPrice, notes || null]
  );
  return rows[0];
};

/**
 * Cancela una reserva (cambia status a cancelled)
 */
const cancel = async (id, cancelledBy) => {
  const { rows } = await pool.query(
    `UPDATE bookings
     SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [cancelledBy, id]
  );
  return rows[0] || null;
};

/**
 * Obtiene horas ya reservadas (pending o confirmed) para un prestador en una fecha
 * Para calcular disponibilidad
 */
const findBookedHoursOnDate = async (providerId, date) => {
  const { rows } = await pool.query(
    `SELECT time FROM bookings
     WHERE provider_id = $1
       AND date = $2
       AND status IN ('pending', 'confirmed')`,
    [providerId, date]
  );
  return rows.map((r) => r.time);
};

/**
 * Obtiene todas las reservas para administración
 */
const findAllForAdmin = async () => {
  const { rows } = await pool.query(
    `SELECT b.*,
            u.name AS client_name,
            pu.name AS provider_name
     FROM bookings b
     JOIN users u ON b.client_id = u.id
     JOIN providers p ON b.provider_id = p.id
     JOIN users pu ON p.user_id = pu.id
     ORDER BY b.created_at DESC`
  );
  return rows;
};

/**
 * Cuenta estadísticas de reservas
 */
const countStats = async () => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'pending') AS pending,
       COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed
     FROM bookings`
  );
  return rows[0];
};

module.exports = {
  findByClientId,
  findByProviderId,
  findById,
  create,
  cancel,
  findBookedHoursOnDate,
  findAllForAdmin,
  countStats,
};
