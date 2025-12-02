import express from 'express';
import {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  getBusSeats,
  getPopularRoutes,
  searchBuses
} from '../controllers/busController.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// Public routes
router.get('/', getBuses);
router.get('/popular-routes', getPopularRoutes);
router.get('/search', searchBuses);
router.get('/:id', getBusById);
router.get('/:busId/seats', getBusSeats);

// Protected routes (Admin only)
router.post('/', auth, admin, createBus);
router.put('/:id', auth, admin, updateBus);
router.delete('/:id', auth, admin, deleteBus);

export default router;