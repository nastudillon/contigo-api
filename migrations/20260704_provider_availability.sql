ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS consultation_address VARCHAR(255);

CREATE TABLE IF NOT EXISTS availability_slots (
  id SERIAL PRIMARY KEY,
  provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  period_key VARCHAR(20) NOT NULL DEFAULT 'manana' CHECK (period_key IN ('manana', 'tarde', 'noche')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  service_mode VARCHAR(20) NOT NULL DEFAULT 'domicilio' CHECK (service_mode IN ('domicilio', 'consulta')),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE availability_slots
  ADD COLUMN IF NOT EXISTS period_key VARCHAR(20) NOT NULL DEFAULT 'manana';

ALTER TABLE availability_slots
  ADD COLUMN IF NOT EXISTS service_mode VARCHAR(20) NOT NULL DEFAULT 'domicilio';

ALTER TABLE availability_slots
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE availability_slots
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'availability_slots_period_key_check'
  ) THEN
    ALTER TABLE availability_slots
      ADD CONSTRAINT availability_slots_period_key_check
      CHECK (period_key IN ('manana', 'tarde', 'noche'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'availability_slots_service_mode_check'
  ) THEN
    ALTER TABLE availability_slots
      ADD CONSTRAINT availability_slots_service_mode_check
      CHECK (service_mode IN ('domicilio', 'consulta'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_availability_slots_provider_day_period
  ON availability_slots (provider_id, day_of_week, period_key);

UPDATE availability_slots
SET period_key = CASE
  WHEN start_time = TIME '08:00' THEN 'manana'
  WHEN start_time = TIME '14:00' THEN 'tarde'
  WHEN start_time = TIME '19:00' THEN 'noche'
  ELSE period_key
END
WHERE period_key IS NULL OR period_key = 'manana';
