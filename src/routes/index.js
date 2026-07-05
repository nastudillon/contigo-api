// Router principal: agrupa todas las rutas de la API
const { Router } = require('express');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const authController = require('../controllers/auth.controller');
const providersController = require('../controllers/providers.controller');
const bookingsController = require('../controllers/bookings.controller');
const adminController = require('../controllers/admin.controller');

const router = Router();

// ──────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/google', authController.googleLogin);
router.get('/auth/me', authMiddleware, authController.getMe);
router.patch('/auth/complete-profile', authMiddleware, authController.completeProfile);

// ──────────────────────────────────────────────
// PROVIDERS
// IMPORTANTE: las rutas /me y /me/bookings deben ir ANTES de /:id
// para que Express no confunda "me" con un id numérico
// ──────────────────────────────────────────────

// Rutas autenticadas del prestador (antes de /:id)
router.put(
  '/providers/me',
  authMiddleware,
  roleMiddleware(['prestador']),
  providersController.updateMyProfile
);

router.get(
  '/providers/me/bookings',
  authMiddleware,
  roleMiddleware(['prestador']),
  providersController.getMyBookings
);

// Rutas públicas de providers
router.get('/providers', providersController.getProviders);
router.get('/providers/:id', providersController.getProviderById);
router.get('/providers/:id/availability', providersController.getAvailability);

// ──────────────────────────────────────────────
// BOOKINGS
// ──────────────────────────────────────────────
router.get('/bookings/me', authMiddleware, bookingsController.getMyBookings);
router.post('/bookings', authMiddleware, bookingsController.createBooking);
router.patch('/bookings/:id/cancel', authMiddleware, bookingsController.cancelBooking);

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────
router.get(
  '/admin/providers',
  authMiddleware,
  roleMiddleware(['admin']),
  adminController.getProviders
);

router.patch(
  '/admin/providers/:id/validate',
  authMiddleware,
  roleMiddleware(['admin']),
  adminController.validateProvider
);

router.get(
  '/admin/bookings',
  authMiddleware,
  roleMiddleware(['admin']),
  adminController.getBookings
);

router.get(
  '/admin/stats',
  authMiddleware,
  roleMiddleware(['admin']),
  adminController.getStats
);

module.exports = router;
