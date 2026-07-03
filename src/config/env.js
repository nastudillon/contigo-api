// Configuración de variables de entorno
require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT, 10) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_eYKwSAObWX12@ep-billowing-sound-at1r4ry9-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  jwt: {
    secret: process.env.JWT_SECRET || '4c9f1a7e2b8d6k3m5p9q2x7v1n4r8t6_contigo_local_dev',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8000',
  // Google OAuth — obligatorio en producción
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
};

module.exports = config;
