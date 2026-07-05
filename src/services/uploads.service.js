const crypto = require('crypto');

const config = require('../config/env');
const usersRepo = require('../repositories/users.repository');
const providersRepo = require('../repositories/providers.repository');

const FOLDER_BY_TARGET = {
  profile: 'profiles',
  provider: 'providers',
  certificate: 'certificates',
  service: 'services',
  temp: 'temp',
};

function ensureCloudinaryConfig() {
  const { cloudName, apiKey, apiSecret } = config.cloudinary;
  if (!cloudName || !apiKey || !apiSecret) {
    const err = new Error('Cloudinary no está configurado en el servidor');
    err.statusCode = 500;
    throw err;
  }
  return { cloudName, apiKey, apiSecret, folderRoot: config.cloudinary.folderRoot || 'contigocerca' };
}

function validateImageData(image) {
  const value = String(image || '');
  if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) {
    const err = new Error('Formato de imagen no válido. Usa PNG, JPG, WEBP o GIF.');
    err.statusCode = 400;
    throw err;
  }
  return value;
}

function sanitizeSlug(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'archivo';
}

function buildSignature(paramsToSign, apiSecret) {
  const serialized = Object.entries(paramsToSign)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(serialized + apiSecret).digest('hex');
}

async function uploadToCloudinary({ image, folder, publicId }) {
  const { cloudName, apiKey, apiSecret } = ensureCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, public_id: publicId, overwrite: 'true', timestamp };
  const signature = buildSignature(paramsToSign, apiSecret);

  const form = new FormData();
  form.append('file', image);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const payload = await response.json();
  if (!response.ok) {
    const err = new Error(payload?.error?.message || 'No se pudo subir la imagen a Cloudinary');
    err.statusCode = 502;
    throw err;
  }

  return {
    url: payload.secure_url,
    publicId: payload.public_id,
    width: payload.width,
    height: payload.height,
    format: payload.format,
  };
}

async function uploadAvatar({ userId, role, image, target = 'profile' }) {
  const imageData = validateImageData(image);
  const currentUser = await usersRepo.findById(userId);
  if (!currentUser) {
    const err = new Error('Usuario no encontrado');
    err.statusCode = 404;
    throw err;
  }

  const normalizedTarget = target === 'provider' && role === 'prestador' ? 'provider' : 'profile';
  const folderKey = FOLDER_BY_TARGET[normalizedTarget] || FOLDER_BY_TARGET.profile;
  const folder = `${config.cloudinary.folderRoot || 'contigocerca'}/${folderKey}`;
  const baseSlug = sanitizeSlug(currentUser.name || currentUser.email || `user-${userId}`);
  const publicId = normalizedTarget === 'provider' ? `provider-${userId}-${baseSlug}` : `user-${userId}-${baseSlug}`;

  const uploaded = await uploadToCloudinary({ image: imageData, folder, publicId });

  const updatedUser = await usersRepo.updateAvatarUrl(userId, uploaded.url);
  let updatedProvider = null;

  if (normalizedTarget === 'provider' && role === 'prestador') {
    updatedProvider = await providersRepo.updateByUserId(userId, { avatar_url: uploaded.url });
  }

  return {
    avatarUrl: uploaded.url,
    publicId: uploaded.publicId,
    user: updatedUser,
    provider: updatedProvider,
    folder,
  };
}

module.exports = {
  uploadAvatar,
};
