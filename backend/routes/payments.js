import express from 'express';
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  getPaymentDetails,
  getUserPayments,
  initiateRefund,
  getRefundDetails,
  getPaymentMethods
} from '../controllers/paymentController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyRazorpayPayment);
router.get('/methods', getPaymentMethods);

// Protected routes
router.use(auth);
router.get('/', getUserPayments);
router.get('/:paymentId', getPaymentDetails);
router.post('/:paymentId/refund', initiateRefund);
router.get('/refunds/:refundId', getRefundDetails);

export default router;