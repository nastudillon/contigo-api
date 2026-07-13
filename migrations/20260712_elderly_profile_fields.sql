-- Campos persistentes para el perfil del adulto mayor
-- Ejecutar una vez en la base de datos de contigo-api.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS street_address VARCHAR(255),
  ADD COLUMN IF NOT EXISTS commune_id INTEGER REFERENCES communes(id) ON DELETE SET NULL;
