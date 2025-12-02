import express from 'express';
import {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  downloadTicket,
  getBookingStats
} from '../controllers/bookingController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(auth);

router.post('/', createBooking);
router.get('/', getUserBookings);
router.get('/stats', getBookingStats);
router.get('/:id', getBookingById);
router.put('/:id/cancel', cancelBooking);
router.get('/:id/download', downloadTicket);

export default router;