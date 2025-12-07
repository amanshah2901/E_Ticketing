import express from 'express';
import {
  getTrains,
  getTrainById,
  createTrain,
  updateTrain,
  deleteTrain,
  searchTrains,
  getPopularRoutes
} from '../controllers/trainController.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// Public routes
router.get('/', getTrains);
router.get('/popular-routes', getPopularRoutes);
router.get('/search', searchTrains);
router.get('/:id', getTrainById);

// Protected routes (Admin only)
router.post('/', auth, admin, createTrain);
router.put('/:id', auth, admin, updateTrain);
router.delete('/:id', auth, admin, deleteTrain);

export default router;



