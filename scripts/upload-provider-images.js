require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const pool = require('../src/db/pool');
const config = require('../src/config/env');

const FRONTEND_PROVIDERS_DIR = path.resolve(__dirname, '../../contigo/public/images/providers');
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function parseCloudinaryUrl(value = '') {
  const match = String(value).match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return {};
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

function ensureCloudinaryConfig() {
  const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_API_ENV_VARIABLE || '');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || parsed.cloudName || config.cloudinary?.cloudName || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || parsed.apiKey || config.cloudinary?.apiKey || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || parsed.apiSecret || config.cloudinary?.apiSecret || '';
  const folderRoot = process.env.CLOUDINARY_FOLDER_ROOT || config.cloudinary?.folderRoot || 'contigocerca';

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Faltan credenciales de Cloudinary en el .env');
  }

  return { cloudName, apiKey, apiSecret, folderRoot };
}

function normalizeSlug(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildSignature(paramsToSign, apiSecret) {
  const serialized = Object.entries(paramsToSign)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(serialized + apiSecret).digest('hex');
}

async function fileToDataUrl(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeByExt = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const mime = mimeByExt[extension];
  if (!mime) throw new Error(`Extension no soportada: ${extension}`);
  const buffer = await fs.readFile(filePath);
  return `data:${mime};base64,${buffer.toString('base64')}`;
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
    throw new Error(payload?.error?.message || 'No se pudo subir la imagen a Cloudinary');
  }

  return payload.secure_url;
}

async function getProvidersBySlug() {
  const { rows } = await pool.query(`
    SELECT p.id AS provider_id, p.user_id, u.name, u.email
    FROM providers p
    JOIN users u ON u.id = p.user_id
  `);

  const map = new Map();
  for (const row of rows) {
    const slug = normalizeSlug(row.name);
    if (!map.has(slug)) {
      map.set(slug, []);
    }
    map.get(slug).push(row);
  }
  return map;
}

async function updateAvatarUrls(userId, providerId, avatarUrl) {
  await pool.query(
    `UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2`,
    [avatarUrl, userId]
  );

  await pool.query(
    `UPDATE providers SET avatar_url = $1, updated_at = NOW() WHERE id = $2`,
    [avatarUrl, providerId]
  );
}

async function main() {
  const { folderRoot } = ensureCloudinaryConfig();
  const providersBySlug = await getProvidersBySlug();
  const files = (await fs.readdir(FRONTEND_PROVIDERS_DIR))
    .filter((file) => ALLOWED_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();

  if (files.length === 0) {
    console.log('No se encontraron imágenes en public/images/providers');
    return;
  }

  const results = [];

  for (const file of files) {
    const slug = normalizeSlug(path.basename(file, path.extname(file)));
    const matches = providersBySlug.get(slug) || [];

    if (matches.length === 0) {
      results.push({ file, status: 'skipped', reason: 'Sin prestador con nombre coincidente' });
      continue;
    }

    if (matches.length > 1) {
      results.push({ file, status: 'skipped', reason: 'Hay más de un prestador con ese nombre', matches: matches.map((item) => item.email) });
      continue;
    }

    const provider = matches[0];
    const image = await fileToDataUrl(path.join(FRONTEND_PROVIDERS_DIR, file));
    const publicId = `provider-${provider.user_id}-${slug}`;
    const folder = `${folderRoot}/providers`;
    const avatarUrl = await uploadToCloudinary({ image, folder, publicId });
    await updateAvatarUrls(provider.user_id, provider.provider_id, avatarUrl);

    results.push({ file, status: 'uploaded', name: provider.name, email: provider.email, avatarUrl });
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
