ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20),
  ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN;

ALTER TABLE IF EXISTS users
  ALTER COLUMN role DROP NOT NULL;

UPDATE users
SET auth_provider = COALESCE(auth_provider, CASE WHEN google_sub IS NOT NULL THEN 'google' ELSE 'local' END),
    status = COALESCE(status, CASE WHEN role IS NULL THEN 'ONBOARDING' ELSE 'ACTIVE' END),
    profile_completed = COALESCE(profile_completed, role IS NOT NULL);

ALTER TABLE IF EXISTS users
  ALTER COLUMN profile_completed SET DEFAULT true,
  ALTER COLUMN status SET DEFAULT 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_unique_idx
  ON users (google_sub)
  WHERE google_sub IS NOT NULL;
