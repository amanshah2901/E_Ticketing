import express from 'express';
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUser,
  getAllBookings,
  updateBooking,
  getRevenueAnalytics
} from '../controllers/adminController.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';

const router = express.Router();

// All routes require admin privileges
router.use(auth, admin);

router.get('/dashboard', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserDetails);
router.put('/users/:userId', updateUser);
router.get('/bookings', getAllBookings);
router.put('/bookings/:bookingId', updateBooking);
router.get('/revenue-analytics', getRevenueAnalytics);

export default router;