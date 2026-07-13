-- Agrega commune_id a elderly_people referenciando la tabla communes existente
ALTER TABLE elderly_people
  ADD COLUMN IF NOT EXISTS commune_id INTEGER REFERENCES communes(id) ON DELETE SET NULL;
