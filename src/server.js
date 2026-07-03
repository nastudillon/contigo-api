// Punto de entrada: levanta el servidor HTTP
require('dotenv').config();
const app = require('./app');
const config = require('./config/env');
const pool = require('./db/pool');

const PORT = config.port;

// Verificar conexión a la base de datos antes de iniciar
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Conexión a PostgreSQL establecida correctamente');

    app.listen(PORT, () => {
      console.log(`contigo-api corriendo en puerto ${PORT} [${config.nodeEnv}]`);
    });
  })
  .catch((err) => {
    console.error('No se pudo conectar a PostgreSQL:', err.message);
    process.exit(1);
  });
