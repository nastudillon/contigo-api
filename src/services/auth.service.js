// Servicio de autenticación: registro, login, Google OAuth, perfil
const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const usersRepo = require('../repositories/users.repository');
const providersRepo = require('../repositories/providers.repository');
const { generateToken } = require('../utils/jwt');
const config = require('../config/env');

const googleClient = new OAuth2Client(config.googleClientId);

/**
 * Registra un nuevo usuario.
 * Si es prestador, crea también el perfil en providers.
 * Si es adulto_mayor, registra el contacto de emergencia.
 */
const register = async ({
  name,
  email,
  phone,
  password,
  role,
  especialidad,
  region_id,
  contactoNombre,
  contactoTelefono,
  contactoRelacion,
}) => {
  // Verificar que el email no esté en uso
  const existing = await usersRepo.findByEmail(email);
  if (existing) {
    const err = new Error('El correo electrónico ya está registrado');
    err.statusCode = 409;
    throw err;
  }

  // Hash de la contraseña
  const passwordHash = await bcrypt.hash(password, 10);

  // Crear usuario
  const user = await usersRepo.create({ name, email, phone, passwordHash, role });

  // Lógica extra según rol
  if (role === 'prestador') {
    // Buscar category_id a partir del slug de especialidad
    let categoryId = null;
    if (especialidad) {
      const category = await providersRepo.findCategoryBySlug(especialidad);
      categoryId = category ? category.id : null;
    }
    await providersRepo.create({
      userId: user.id,
      categoryId,
      regionId: region_id || null,
      location: null,
    });
  }

  if (role === 'adulto_mayor' && contactoNombre && contactoTelefono) {
    await usersRepo.createElderlyContact({
      userId: user.id,
      contactName: contactoNombre,
      contactPhone: contactoTelefono,
      relation: contactoRelacion || 'otro',
    });
  }

  // Generar token
  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return { user, token };
};

/**
 * Autentica un usuario por email y contraseña.
 */
const login = async ({ email, password }) => {
  // Buscar usuario incluyendo password_hash
  const userWithHash = await usersRepo.findByEmail(email);
  if (!userWithHash) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  if (!userWithHash.is_active) {
    const err = new Error('Cuenta desactivada. Contacta al administrador.');
    err.statusCode = 403;
    throw err;
  }

  // Verificar contraseña
  const isValid = await bcrypt.compare(password, userWithHash.password_hash);
  if (!isValid) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  // Construir objeto user sin password_hash
  const { password_hash, ...user } = userWithHash;

  // Generar token
  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return { user, token };
};

/**
 * Obtiene el perfil del usuario autenticado por id.
 */
const getMe = async (userId) => {
  const user = await usersRepo.findById(userId);
  if (!user) {
    const err = new Error('Usuario no encontrado');
    err.statusCode = 404;
    throw err;
  }
  return user;
};

/**
 * Login o registro con Google.
 * Valida el ID token contra Google, crea o vincula usuario en PostgreSQL
 * y devuelve JWT interno del sistema.
 */
const googleLogin = async ({ credential }) => {
  if (!config.googleClientId) {
    const err = new Error('GOOGLE_CLIENT_ID no configurado en el servidor');
    err.statusCode = 500;
    throw err;
  }

  // 1. Verificar el ID token con Google
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
  } catch {
    const err = new Error('Token de Google inválido o expirado');
    err.statusCode = 401;
    throw err;
  }

  const payload = ticket.getPayload();
  const { sub: googleSub, email, name, picture } = payload;

  // 2. Buscar usuario por google_sub
  let user = await usersRepo.findByGoogleSub(googleSub);

  if (!user) {
    // 3a. Buscar por email (usuario registrado previamente con contraseña)
    const existingByEmail = await usersRepo.findByEmail(email);

    if (existingByEmail) {
      // Vincular cuenta existente a Google
      user = await usersRepo.linkGoogleAccount(existingByEmail.id, googleSub, picture);
    } else {
      // 3b. Crear nuevo usuario con rol 'familiar' (rol cliente por defecto)
      user = await usersRepo.createFromGoogle({
        name,
        email,
        avatarUrl: picture,
        googleSub,
        role: 'familiar',
      });
    }
  }

  if (!user.is_active) {
    const err = new Error('Cuenta desactivada. Contacta al administrador.');
    err.statusCode = 403;
    throw err;
  }

  // 4. Generar JWT interno del sistema
  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url,
      auth_provider: user.auth_provider,
    },
    token,
  };
};

module.exports = { register, login, googleLogin, getMe };
