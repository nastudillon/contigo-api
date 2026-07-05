const bcrypt = require('bcryptjs');
const pool = require('../src/db/pool');

const DEMO_PASSWORD = process.env.DEMO_PROVIDER_PASSWORD || 'Demo123456!';
const DEFAULT_REGION = 'Region Metropolitana de Santiago';

const CATEGORY_SEED = [
  { slug: 'kinesiologia', label: 'Kinesiologia', icon: '🦵', colorBg: '#DDF5F3', colorText: '#0EA5A4' },
  { slug: 'enfermeria', label: 'Enfermeria', icon: '💉', colorBg: '#E6EDFD', colorText: '#2563EB' },
  { slug: 'cuidador', label: 'Cuidador', icon: '🤝', colorBg: '#FCE7F1', colorText: '#DB2777' },
  { slug: 'podologia', label: 'Podologia', icon: '🦶', colorBg: '#FBEEDC', colorText: '#D97706' },
  { slug: 'compania', label: 'Compania', icon: '❤️', colorBg: '#EFE9FD', colorText: '#7C3AED' },
];

const CERTIFICATION_SEED = [
  { label: 'Certificado', icon: '✅' },
  { label: 'Atencion domiciliaria', icon: '🏠' },
  { label: 'Urgencias 24/7', icon: '🕒' },
  { label: 'Habla ingles', icon: '🌐' },
  { label: 'Adulto mayor postrado', icon: '🛏️' },
];

const DEMO_PROVIDERS = [
  {
    name: 'Maria Gonzalez',
    email: 'demo.maria@contigocerca.cl',
    phone: '+56923456781',
    categorySlug: 'enfermeria',
    specialties: [
      {
        categorySlug: 'enfermeria',
        active: true,
        services: [
          { name: 'Control de medicamentos', description: 'Administracion y supervision segura de medicamentos.', price: 12000 },
          { name: 'Curacion de heridas', description: 'Curaciones basicas y seguimiento en domicilio.', price: 14000 },
          { name: 'Control de signos vitales', description: 'Monitoreo de presion, saturacion y temperatura.', price: 10000 },
          { name: 'Inyecciones', description: 'Aplicacion de tratamientos segun indicacion medica.', price: 12000 },
        ],
      },
    ],
    certifications: ['Certificado', 'Atencion domiciliaria', 'Urgencias 24/7'],
    communes: ['Providencia', 'Santiago'],
    bio: 'Enfermera titulada con amplia experiencia en cuidado domiciliario, control de patologias cronicas y acompanamiento postoperatorio.',
    hourlyRate: 12000,
    experienceYears: 8,
    consultationAddress: 'Av. Providencia 2450, Providencia',
    ratingAvg: 4.9,
    reviewCount: 48,
    featured: true,
    availability: [
      { dayOfWeek: 0, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 0, periodKey: 'tarde', serviceMode: 'consulta' },
      { dayOfWeek: 1, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 1, periodKey: 'tarde', serviceMode: 'consulta' },
      { dayOfWeek: 2, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 2, periodKey: 'tarde', serviceMode: 'consulta' },
      { dayOfWeek: 3, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 3, periodKey: 'tarde', serviceMode: 'consulta' },
      { dayOfWeek: 4, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 4, periodKey: 'tarde', serviceMode: 'consulta' },
    ],
  },
  {
    name: 'Carlos Rivas',
    email: 'demo.carlos@contigocerca.cl',
    phone: '+56923456782',
    categorySlug: 'kinesiologia',
    specialties: [
      {
        categorySlug: 'kinesiologia',
        active: true,
        services: [
          { name: 'Rehabilitacion fisica', description: 'Plan de ejercicios personalizados para recuperar movilidad.', price: 15000 },
          { name: 'Masoterapia', description: 'Trabajo muscular para aliviar dolor y tension.', price: 14000 },
          { name: 'Electroterapia', description: 'Apoyo terapeutico para recuperacion funcional.', price: 16000 },
          { name: 'Ejercicios terapeuticos', description: 'Rutinas guiadas para fortalecer y prevenir caidas.', price: 15000 },
        ],
      },
    ],
    certifications: ['Certificado', 'Atencion domiciliaria'],
    communes: ['Las Condes', 'Vitacura'],
    bio: 'Kinesiologo especializado en rehabilitacion de adultos mayores, recuperacion postcirugia y prevencion de caidas.',
    hourlyRate: 15000,
    experienceYears: 6,
    consultationAddress: 'Av. Apoquindo 5151, Las Condes',
    ratingAvg: 4.8,
    reviewCount: 35,
    featured: true,
    availability: [
      { dayOfWeek: 0, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 1, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 2, periodKey: 'manana', serviceMode: 'consulta' },
      { dayOfWeek: 3, periodKey: 'tarde', serviceMode: 'consulta' },
      { dayOfWeek: 4, periodKey: 'tarde', serviceMode: 'domicilio' },
      { dayOfWeek: 5, periodKey: 'manana', serviceMode: 'consulta' },
    ],
  },
  {
    name: 'Ana Torres',
    email: 'demo.ana@contigocerca.cl',
    phone: '+56923456783',
    categorySlug: 'cuidador',
    specialties: [
      {
        categorySlug: 'cuidador',
        active: true,
        services: [
          { name: 'Asistencia en actividades diarias', description: 'Apoyo para higiene, vestido y rutina diaria.', price: 9000 },
          { name: 'Preparacion de alimentos', description: 'Preparacion de comidas y apoyo en hidratacion.', price: 8500 },
          { name: 'Acompanamiento medico', description: 'Traslado y acompanamiento a consultas medicas.', price: 9500 },
          { name: 'Higiene personal', description: 'Apoyo respetuoso y seguro en cuidado personal.', price: 9000 },
        ],
      },
    ],
    certifications: ['Certificado', 'Adulto mayor postrado'],
    communes: ['Ñuñoa', 'La Reina'],
    bio: 'Cuidadora certificada con experiencia en acompanamiento cercano, estimulo cognitivo y apoyo a personas con demencia.',
    hourlyRate: 9000,
    experienceYears: 10,
    consultationAddress: '',
    ratingAvg: 5.0,
    reviewCount: 62,
    featured: true,
    availability: [
      { dayOfWeek: 0, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 0, periodKey: 'tarde', serviceMode: 'domicilio' },
      { dayOfWeek: 1, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 1, periodKey: 'tarde', serviceMode: 'domicilio' },
      { dayOfWeek: 2, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 3, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 4, periodKey: 'tarde', serviceMode: 'domicilio' },
      { dayOfWeek: 5, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 6, periodKey: 'manana', serviceMode: 'domicilio' },
    ],
  },
  {
    name: 'Luis Morales',
    email: 'demo.luis@contigocerca.cl',
    phone: '+56923456784',
    categorySlug: 'podologia',
    specialties: [
      {
        categorySlug: 'podologia',
        active: true,
        services: [
          { name: 'Corte de uñas', description: 'Atencion podologica preventiva y cuidado basal.', price: 11000 },
          { name: 'Tratamiento de hongos', description: 'Evaluacion y manejo podologico de micosis.', price: 13000 },
          { name: 'Durezas y callosidades', description: 'Limpieza y alivio podologico a domicilio.', price: 12000 },
          { name: 'Plantillas ortopedicas', description: 'Orientacion y adaptacion de apoyo podal.', price: 15000 },
        ],
      },
    ],
    certifications: ['Certificado', 'Atencion domiciliaria'],
    communes: ['Santiago', 'Estacion Central'],
    bio: 'Podologo enfocado en salud del pie para personas mayores y pacientes diabeticos con atencion domiciliaria.',
    hourlyRate: 11000,
    experienceYears: 5,
    consultationAddress: 'Catedral 1450, Santiago',
    ratingAvg: 4.7,
    reviewCount: 29,
    featured: false,
    availability: [
      { dayOfWeek: 1, periodKey: 'manana', serviceMode: 'consulta' },
      { dayOfWeek: 2, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 3, periodKey: 'manana', serviceMode: 'domicilio' },
      { dayOfWeek: 4, periodKey: 'manana', serviceMode: 'consulta' },
      { dayOfWeek: 5, periodKey: 'manana', serviceMode: 'domicilio' },
    ],
  },
  {
    name: 'Sofia Vargas',
    email: 'demo.sofia@contigocerca.cl',
    phone: '+56923456785',
    categorySlug: 'compania',
    specialties: [
      {
        categorySlug: 'compania',
        active: true,
        services: [
          { name: 'Lectura y conversacion', description: 'Acompanamiento cercano y contencion emocional.', price: 8000 },
          { name: 'Juegos de mesa', description: 'Estimulo cognitivo mediante actividades recreativas.', price: 8000 },
          { name: 'Paseos y actividades', description: 'Acompanamiento en salidas cortas y rutina activa.', price: 8500 },
          { name: 'Estimulación cognitiva', description: 'Rutinas de memoria y conversacion guiada.', price: 9000 },
        ],
      },
    ],
    certifications: ['Certificado', 'Habla ingles'],
    communes: ['Vitacura', 'Las Condes'],
    bio: 'Profesional de compania y actividades para personas mayores, enfocada en bienestar emocional y estimulo cognitivo.',
    hourlyRate: 8000,
    experienceYears: 4,
    consultationAddress: '',
    ratingAvg: 4.9,
    reviewCount: 41,
    featured: false,
    availability: [
      { dayOfWeek: 0, periodKey: 'tarde', serviceMode: 'domicilio' },
      { dayOfWeek: 1, periodKey: 'tarde', serviceMode: 'domicilio' },
      { dayOfWeek: 2, periodKey: 'tarde', serviceMode: 'consulta' },
      { dayOfWeek: 3, periodKey: 'tarde', serviceMode: 'domicilio' },
      { dayOfWeek: 4, periodKey: 'tarde', serviceMode: 'consulta' },
    ],
  },
  {
    name: 'Roberto Fuentes',
    email: 'demo.roberto@contigocerca.cl',
    phone: '+56923456786',
    categorySlug: 'enfermeria',
    specialties: [
      {
        categorySlug: 'enfermeria',
        active: true,
        services: [
          { name: 'Administracion de medicamentos', description: 'Manejo seguro de tratamientos y dosis.', price: 13000 },
          { name: 'Manejo de sonda nasogastrica', description: 'Apoyo especializado en sondas y alimentacion.', price: 15000 },
          { name: 'Curacion avanzada', description: 'Curaciones de mayor complejidad en domicilio.', price: 16000 },
          { name: 'Oxigenoterapia', description: 'Apoyo y monitoreo de equipos respiratorios.', price: 15000 },
        ],
      },
    ],
    certifications: ['Certificado', 'Urgencias 24/7', 'Adulto mayor postrado'],
    communes: ['La Florida', 'Macul'],
    bio: 'Enfermero con experiencia en cuidados intensivos y domiciliarios, manejo de equipos medicos y soporte respiratorio.',
    hourlyRate: 13000,
    experienceYears: 7,
    consultationAddress: 'Av. La Florida 9200, La Florida',
    ratingAvg: 4.6,
    reviewCount: 22,
    featured: false,
    availability: [
      { dayOfWeek: 0, periodKey: 'noche', serviceMode: 'domicilio' },
      { dayOfWeek: 1, periodKey: 'noche', serviceMode: 'domicilio' },
      { dayOfWeek: 2, periodKey: 'noche', serviceMode: 'consulta' },
      { dayOfWeek: 3, periodKey: 'noche', serviceMode: 'domicilio' },
      { dayOfWeek: 4, periodKey: 'noche', serviceMode: 'domicilio' },
      { dayOfWeek: 5, periodKey: 'manana', serviceMode: 'consulta' },
      { dayOfWeek: 6, periodKey: 'manana', serviceMode: 'domicilio' },
    ],
  },
];

const PERIOD_TIME_BY_KEY = {
  manana: { startTime: '08:00:00', endTime: '13:00:00' },
  tarde: { startTime: '14:00:00', endTime: '19:00:00' },
  noche: { startTime: '19:00:00', endTime: '22:00:00' },
};

async function getTableColumns(client, tableName) {
  const { rows } = await client.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = CURRENT_SCHEMA()
       AND table_name = $1`,
    [tableName]
  );
  return new Set(rows.map((row) => row.column_name));
}

async function ensureRegion(client, name) {
  const existing = await client.query(
    'SELECT id FROM regions WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [name]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await client.query(
    'INSERT INTO regions (name) VALUES ($1) RETURNING id',
    [name]
  );
  return inserted.rows[0].id;
}

async function ensureCommune(client, regionId, name) {
  const existing = await client.query(
    'SELECT id FROM communes WHERE region_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
    [regionId, name]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await client.query(
    'INSERT INTO communes (region_id, name) VALUES ($1, $2) RETURNING id',
    [regionId, name]
  );
  return inserted.rows[0].id;
}

async function ensureCategory(client, category) {
  const existing = await client.query(
    'SELECT id FROM categories WHERE slug = $1 LIMIT 1',
    [category.slug]
  );

  if (existing.rows[0]) {
    await client.query(
      `UPDATE categories
       SET label = $1,
           icon = $2,
           color_bg = $3,
           color_text = $4
       WHERE id = $5`,
      [category.label, category.icon, category.colorBg, category.colorText, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO categories (slug, label, icon, color_bg, color_text, provider_count)
     VALUES ($1, $2, $3, $4, $5, 0)
     RETURNING id`,
    [category.slug, category.label, category.icon, category.colorBg, category.colorText]
  );
  return inserted.rows[0].id;
}

async function ensureCertification(client, certification) {
  const existing = await client.query(
    'SELECT id FROM certifications WHERE LOWER(label) = LOWER($1) LIMIT 1',
    [certification.label]
  );
  if (existing.rows[0]) {
    await client.query(
      'UPDATE certifications SET icon = $1 WHERE id = $2',
      [certification.icon, existing.rows[0].id]
    );
    return existing.rows[0].id;
  }

  const inserted = await client.query(
    'INSERT INTO certifications (label, icon) VALUES ($1, $2) RETURNING id',
    [certification.label, certification.icon]
  );
  return inserted.rows[0].id;
}

async function ensureUser(client, userData, passwordHash) {
  const existing = await client.query(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [userData.email]
  );

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE users
       SET name = $1,
           phone = $2,
           password_hash = $3,
           role = 'prestador',
           auth_provider = 'local',
           is_active = true,
           status = 'ACTIVE',
           profile_completed = true,
           updated_at = NOW()
       WHERE id = $4
       RETURNING id`,
      [userData.name, userData.phone, passwordHash, existing.rows[0].id]
    );
    return rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO users (
      name, email, phone, password_hash, role, auth_provider,
      is_active, status, profile_completed, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, 'prestador', 'local', true, 'ACTIVE', true, NOW(), NOW())
     RETURNING id`,
    [userData.name, userData.email, userData.phone, passwordHash]
  );
  return inserted.rows[0].id;
}

async function ensureProvider(client, userId, providerData, categoryId, regionId, location) {
  const existing = await client.query(
    'SELECT id FROM providers WHERE user_id = $1 LIMIT 1',
    [userId]
  );

  const params = [
    categoryId,
    regionId,
    providerData.bio,
    providerData.hourlyRate,
    providerData.experienceYears,
    location,
    providerData.featured,
    providerData.ratingAvg,
    providerData.reviewCount,
    providerData.consultationAddress || null,
  ];

  if (existing.rows[0]) {
    const { rows } = await client.query(
      `UPDATE providers
       SET category_id = $1,
           region_id = $2,
           bio = $3,
           hourly_rate = $4,
           experience_years = $5,
           location = $6,
           is_verified = true,
           is_featured = $7,
           validation_status = 'approved',
           rating_avg = $8,
           review_count = $9,
           consultation_address = $10,
           updated_at = NOW()
       WHERE user_id = $11
       RETURNING id`,
      [...params, userId]
    );
    return rows[0].id;
  }

  const inserted = await client.query(
    `INSERT INTO providers (
      user_id, category_id, region_id, bio, hourly_rate, experience_years,
      location, is_verified, is_featured, validation_status, rating_avg,
      review_count, consultation_address, created_at, updated_at
    )
     VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, 'approved', $9, $10, $11, NOW(), NOW())
     RETURNING id`,
    [
      userId,
      categoryId,
      regionId,
      providerData.bio,
      providerData.hourlyRate,
      providerData.experienceYears,
      location,
      providerData.featured,
      providerData.ratingAvg,
      providerData.reviewCount,
      providerData.consultationAddress || null,
    ]
  );
  return inserted.rows[0].id;
}

async function replaceCoverage(client, providerId, communeIds) {
  await client.query('DELETE FROM provider_coverage WHERE provider_id = $1', [providerId]);
  for (const communeId of communeIds) {
    await client.query(
      'INSERT INTO provider_coverage (provider_id, commune_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [providerId, communeId]
    );
  }
}

async function replaceCertifications(client, providerId, certificationIds) {
  await client.query('DELETE FROM provider_certifications WHERE provider_id = $1', [providerId]);
  for (const certificationId of certificationIds) {
    await client.query(
      'INSERT INTO provider_certifications (provider_id, certification_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [providerId, certificationId]
    );
  }
}

async function replaceSpecialties(client, providerId, specialties, categoryIdsBySlug) {
  await client.query(
    `DELETE FROM provider_services
     WHERE provider_specialty_id IN (
       SELECT id FROM provider_specialties WHERE provider_id = $1
     )`,
    [providerId]
  );
  await client.query('DELETE FROM provider_specialties WHERE provider_id = $1', [providerId]);

  for (const specialty of specialties) {
    const categoryId = categoryIdsBySlug.get(specialty.categorySlug);
    const insertedSpecialty = await client.query(
      `INSERT INTO provider_specialties (provider_id, category_id, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id`,
      [providerId, categoryId, specialty.active !== false]
    );

    const providerSpecialtyId = insertedSpecialty.rows[0].id;
    for (const service of specialty.services) {
      await client.query(
        `INSERT INTO provider_services (provider_id, provider_specialty_id, name, description, price)
         VALUES ($1, $2, $3, $4, $5)`,
        [providerId, providerSpecialtyId, service.name, service.description, service.price]
      );
    }
  }
}

async function replaceAvailability(client, providerId, availability, availabilityColumns) {
  await client.query('DELETE FROM availability_slots WHERE provider_id = $1', [providerId]);

  for (const slot of availability) {
    const baseColumns = ['provider_id', 'day_of_week', 'start_time', 'end_time'];
    const baseValues = [
      providerId,
      slot.dayOfWeek,
      PERIOD_TIME_BY_KEY[slot.periodKey].startTime,
      PERIOD_TIME_BY_KEY[slot.periodKey].endTime,
    ];

    if (availabilityColumns.has('period_key')) {
      baseColumns.push('period_key');
      baseValues.push(slot.periodKey);
    }
    if (availabilityColumns.has('service_mode')) {
      baseColumns.push('service_mode');
      baseValues.push(slot.serviceMode === 'consulta' ? 'consulta' : 'domicilio');
    }
    if (availabilityColumns.has('is_available')) {
      baseColumns.push('is_available');
      baseValues.push(true);
    }
    if (availabilityColumns.has('created_at')) baseColumns.push('created_at');
    if (availabilityColumns.has('updated_at')) baseColumns.push('updated_at');

    const placeholders = [];
    let paramIndex = 1;
    for (const column of baseColumns) {
      if (column === 'created_at' || column === 'updated_at') {
        placeholders.push('NOW()');
      } else {
        placeholders.push(`$${paramIndex}`);
        paramIndex += 1;
      }
    }

    await client.query(
      `INSERT INTO availability_slots (${baseColumns.join(', ')})
       VALUES (${placeholders.join(', ')})`,
      baseValues
    );
  }
}

async function refreshCategoryCounts(client) {
  await client.query(
    `UPDATE categories c
     SET provider_count = sub.total
     FROM (
       SELECT p.category_id, COUNT(*)::int AS total
       FROM providers p
       WHERE p.validation_status = 'approved'
         AND p.is_verified = true
         AND p.category_id IS NOT NULL
       GROUP BY p.category_id
     ) sub
     WHERE sub.category_id = c.id`
  );

  await client.query(
    `UPDATE categories
     SET provider_count = 0
     WHERE id NOT IN (
       SELECT DISTINCT category_id
       FROM providers
       WHERE validation_status = 'approved'
         AND is_verified = true
         AND category_id IS NOT NULL
     )`
  );
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const availabilityColumns = await getTableColumns(client, 'availability_slots');
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const regionId = await ensureRegion(client, DEFAULT_REGION);

    const categoryIdsBySlug = new Map();
    for (const category of CATEGORY_SEED) {
      categoryIdsBySlug.set(category.slug, await ensureCategory(client, category));
    }

    const certificationIdsByLabel = new Map();
    for (const certification of CERTIFICATION_SEED) {
      certificationIdsByLabel.set(certification.label, await ensureCertification(client, certification));
    }

    for (const provider of DEMO_PROVIDERS) {
      const communeIds = [];
      for (const communeName of provider.communes) {
        communeIds.push(await ensureCommune(client, regionId, communeName));
      }

      const location = provider.communes.join(', ');
      const userId = await ensureUser(client, provider, passwordHash);
      const providerId = await ensureProvider(
        client,
        userId,
        provider,
        categoryIdsBySlug.get(provider.categorySlug),
        regionId,
        location
      );

      await replaceCoverage(client, providerId, communeIds);
      await replaceCertifications(
        client,
        providerId,
        provider.certifications.map((label) => certificationIdsByLabel.get(label)).filter(Boolean)
      );
      await replaceSpecialties(client, providerId, provider.specialties, categoryIdsBySlug);
      await replaceAvailability(client, providerId, provider.availability, availabilityColumns);
    }

    await refreshCategoryCounts(client);
    await client.query('COMMIT');

    console.log('Seed demo de 6 prestadores completado.');
    console.log(`Password comun de acceso: ${DEMO_PASSWORD}`);
    console.log('Correos creados:');
    for (const provider of DEMO_PROVIDERS) {
      console.log(`- ${provider.email}`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear los prestadores demo:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
