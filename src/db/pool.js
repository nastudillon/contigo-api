// Configuración del pool de conexiones a PostgreSQL
const { Pool } = require('pg');
const config = require('../config/env');

const pool = new Pool({
  connectionString: config.databaseUrl,
  // Configuración adicional del pool
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Verificar conexión al iniciar
pool.on('connect', () => {
  if (config.nodeEnv === 'development') {
    console.log('Nueva conexión establecida con PostgreSQL');
  }
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
  process.exit(-1);
});

module.exports = pool;
