import express from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getFeaturedEvents,
  getEventsByCategory,
  searchEvents
} from '../controllers/eventController.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// Public routes
router.get('/', getEvents);
router.get('/featured', getFeaturedEvents);
router.get('/category/:category', getEventsByCategory);
router.get('/search', searchEvents);
router.get('/:id', getEventById);

// Protected routes (Admin only)
router.post('/', auth, admin, createEvent);
router.put('/:id', auth, admin, updateEvent);
router.delete('/:id', auth, admin, deleteEvent);

export default router;