const pool = require('../db/pool');

const findByUserId = async (userId) => {
  const { rows } = await pool.query(
    `SELECT ep.id, ep.name, ep.relation, ep.age, ep.address, ep.notes,
            COALESCE(
              json_agg(ec.label ORDER BY ec.label) FILTER (WHERE ec.id IS NOT NULL),
              '[]'::json
            ) AS difficulties
     FROM elderly_people ep
     LEFT JOIN elderly_people_conditions epc ON epc.elderly_person_id = ep.id
     LEFT JOIN elderly_conditions ec ON ec.id = epc.condition_id
     WHERE ep.user_id = $1
     GROUP BY ep.id
     ORDER BY ep.id`,
    [userId]
  );
  return rows;
};

const replaceAll = async (userId, seniors) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('DELETE FROM elderly_people WHERE user_id = $1', [userId]);

    for (const s of seniors) {
      const age = s.age !== '' && s.age != null ? parseInt(s.age, 10) : null;
      const { rows } = await client.query(
        `INSERT INTO elderly_people (user_id, name, relation, age, address, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [userId, s.name || '', s.relation || '', age, s.address || '', s.notes || '']
      );
      const epId = rows[0].id;

      if (Array.isArray(s.difficulties) && s.difficulties.length > 0) {
        const { rows: conditions } = await client.query(
          `SELECT id FROM elderly_conditions WHERE label = ANY($1)`,
          [s.difficulties]
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

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { findByUserId, replaceAll };
