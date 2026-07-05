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
  const existing = await usersRepo.findByEmail(email);
  if (existing) {
    const err = new Error('El correo electrónico ya está registrado');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await usersRepo.create({ name, email, phone, passwordHash, role });

  if (role === 'prestador') {
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

  if (!userWithHash.password_hash) {
    const err = new Error('Esta cuenta fue registrada con Google. Usa "Continuar con Google" para iniciar sesión.');
    err.statusCode = 409;
    throw err;
  }

  const isValid = await bcrypt.compare(password, userWithHash.password_hash);
  if (!isValid) {
    const err = new Error('Credenciales inválidas');
    err.statusCode = 401;
    throw err;
  }

  const { password_hash, ...user } = userWithHash;

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
  const { sub: googleSub, email, email_verified: emailVerified, name, picture } = payload;

  if (!googleSub || !email) {
    const err = new Error('No fue posible obtener la información básica de la cuenta Google.');
    err.statusCode = 401;
    throw err;
  }

  if (!emailVerified) {
    const err = new Error('La cuenta de Google debe tener el correo verificado para iniciar sesión.');
    err.statusCode = 401;
    throw err;
  }

  let user = await usersRepo.findByGoogleSub(googleSub);

  if (!user) {
    const existingByEmail = await usersRepo.findByEmail(email);

    if (existingByEmail) {
      user = await usersRepo.linkGoogleAccount(existingByEmail.id, googleSub, picture);
    } else {
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
      google_sub: user.google_sub || googleSub,
    },
    token,
  };
};

module.exports = { register, login, googleLogin, getMe };
