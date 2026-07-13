const pool = require('../db/pool');

const findByUserId = async (userId) => {
  const { rows } = await pool.query(
    `SELECT ep.id, ep.name, ep.relation, ep.age, ep.address, ep.commune_id,
            c.name AS commune_name,
            ep.notes,
            COALESCE(
              json_agg(ec.label ORDER BY ec.label) FILTER (WHERE ec.id IS NOT NULL),
              '[]'::json
            ) AS difficulties
     FROM elderly_people ep
     LEFT JOIN communes c ON c.id = ep.commune_id
     LEFT JOIN elderly_people_conditions epc ON epc.elderly_person_id = ep.id
     LEFT JOIN elderly_conditions ec ON ec.id = epc.condition_id
     WHERE ep.user_id = $1
     GROUP BY ep.id, c.name
     ORDER BY ep.id`,
    [userId]
  );
  return rows;
};

const replaceAll = async (userId, seniors) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // IDs numéricos que ya existen en BD para este usuario
    const { rows: existing } = await client.query(
      'SELECT id FROM elderly_people WHERE user_id = $1', [userId]
    );
    const existingIds = new Set(existing.map(r => r.id));
    const keptIds    = new Set();

    for (const s of seniors) {
      const age      = s.age !== '' && s.age != null ? parseInt(s.age, 10) : null;
      const numericId = Number(s.id);
      const isExisting = !isNaN(numericId) && existingIds.has(numericId);

      let epId;

      if (isExisting) {
        // UPDATE — preserva el ID para no romper FKs en bookings
        await client.query(
          `UPDATE elderly_people
           SET name=$1, relation=$2, age=$3, address=$4, commune_id=$5, notes=$6
           WHERE id=$7 AND user_id=$8`,
          [s.name || '', s.relation || '', age, s.address || '', s.commune_id || null, s.notes || '', numericId, userId]
        );
        epId = numericId;
      } else {
        // INSERT nuevo
        const { rows } = await client.query(
          `INSERT INTO elderly_people (user_id, name, relation, age, address, commune_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [userId, s.name || '', s.relation || '', age, s.address || '', s.commune_id || null, s.notes || '']
        );
        epId = rows[0].id;
      }

      keptIds.add(epId);

      // Reemplaza condiciones (no tienen FKs externas)
      await client.query(
        'DELETE FROM elderly_people_conditions WHERE elderly_person_id = $1', [epId]
      );
      if (Array.isArray(s.difficulties) && s.difficulties.length > 0) {
        const { rows: conditions } = await client.query(
          'SELECT id FROM elderly_conditions WHERE label = ANY($1)', [s.difficulties]
        );
        for (const cond of conditions) {
          await client.query(
            `INSERT INTO elderly_people_conditions (elderly_person_id, condition_id)
             VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [epId, cond.id]
          );
        }
      }
    }

    // Elimina solo los que ya no están en la lista (ON DELETE SET NULL protege bookings)
    const toDelete = [...existingIds].filter(id => !keptIds.has(id));
    if (toDelete.length > 0) {
      await client.query(
        'DELETE FROM elderly_people WHERE id = ANY($1::int[]) AND user_id = $2',
        [toDelete, userId]
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

module.exports = { findByUserId, replaceAll };
