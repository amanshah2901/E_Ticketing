import express from 'express';
import {
  getTours,
  getTourById,
  createTour,
  updateTour,
  deleteTour,
  getFeaturedTours,
  getToursByDestination,
  searchTours
} from '../controllers/tourController.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// Public routes
router.get('/', getTours);
router.get('/featured', getFeaturedTours);
router.get('/destination/:destination', getToursByDestination);
router.get('/search', searchTours);
router.get('/:id', getTourById);

// Protected routes (Admin only)
router.post('/', auth, admin, createTour);
router.put('/:id', auth, admin, updateTour);
router.delete('/:id', auth, admin, deleteTour);

export default router;