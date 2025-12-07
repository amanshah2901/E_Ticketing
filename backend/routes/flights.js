import express from 'express';
import {
  getFlights,
  getFlightById,
  createFlight,
  updateFlight,
  deleteFlight,
  searchFlights,
  getPopularRoutes
} from '../controllers/flightController.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// Public routes
router.get('/', getFlights);
router.get('/popular-routes', getPopularRoutes);
router.get('/search', searchFlights);
router.get('/:id', getFlightById);

// Protected routes (Admin only)
router.post('/', auth, admin, createFlight);
router.put('/:id', auth, admin, updateFlight);
router.delete('/:id', auth, admin, deleteFlight);

export default router;



