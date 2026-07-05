// Configuración principal de Express
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/env');
const router = require('./routes/index');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// ── Seguridad y utilidades ─────────────────────
app.use(helmet());

app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Logging de peticiones HTTP (solo en desarrollo)
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Parseo de JSON
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));

// ── Health check ───────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'contigo-api funcionando correctamente',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// ── Rutas de la API ────────────────────────────
app.use('/api/v1', router);

// ── Ruta no encontrada ─────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ── Manejo centralizado de errores ────────────
app.use(errorMiddleware);

module.exports = app;
