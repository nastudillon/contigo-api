CREATE TABLE IF NOT EXISTS provider_specialties
(
    id         serial primary key,
    provider_id integer not null references providers on delete cascade,
    category_id integer not null references categories,
    is_active  boolean default true not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now(),
    constraint provider_specialties_provider_category_key unique (provider_id, category_id)
);

ALTER TABLE IF EXISTS provider_services
    ADD COLUMN IF NOT EXISTS provider_specialty_id integer references provider_specialties on delete cascade,
    ADD COLUMN IF NOT EXISTS name varchar(120),
    ADD COLUMN IF NOT EXISTS price integer default 0;

INSERT INTO provider_specialties (provider_id, category_id, is_active, created_at, updated_at)
SELECT p.id, p.category_id, true, now(), now()
FROM providers p
WHERE p.category_id IS NOT NULL
ON CONFLICT (provider_id, category_id) DO NOTHING;

UPDATE provider_services ps
SET provider_specialty_id = psp.id,
    name = COALESCE(ps.name, ps.description)
FROM provider_specialties psp
JOIN providers p ON p.id = psp.provider_id AND p.category_id = psp.category_id
WHERE ps.provider_id = psp.provider_id
  AND ps.provider_specialty_id IS NULL;

UPDATE provider_services
SET name = COALESCE(name, description),
    price = COALESCE(price, 0)
WHERE name IS NULL OR price IS NULL;

CREATE INDEX IF NOT EXISTS idx_provider_specialties_provider
    ON provider_specialties (provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_specialties_category
    ON provider_specialties (category_id);

CREATE INDEX IF NOT EXISTS idx_provider_services_specialty
    ON provider_services (provider_specialty_id);
