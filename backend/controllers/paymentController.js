import dotenv from "dotenv";
dotenv.config();

import Razorpay from 'razorpay';
import crypto from 'crypto';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';

const hasRazorpayConfig =
  Boolean(process.env.RAZORPAY_KEY_ID) &&
  Boolean(process.env.RAZORPAY_KEY_SECRET);

const shouldMockRazorpay =
  process.env.RAZORPAY_MOCK === 'true' || !hasRazorpayConfig;

console.log('Razorpay Config Check:');
console.log('hasRazorpayConfig:', hasRazorpayConfig);
console.log('shouldMockRazorpay:', shouldMockRazorpay);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'Present' : 'Missing');

// Lazy initialization
let razorpayInstance = null;

const getRazorpay = () => {
  if (!hasRazorpayConfig) {
    console.log('No Razorpay config, returning null');
    return null;
  }
  if (!razorpayInstance) {
    try {
      razorpayInstance = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
      console.log('Razorpay instance created successfully');
    } catch (error) {
      console.error('Error creating Razorpay instance:', error);
      return null;
    }
  }
  return razorpayInstance;
};

// Create Razorpay order
export const createRazorpayOrder = async (req, res) => {
  try {
    const razorpay = getRazorpay();
    const { amount, currency = 'INR', receipt } = req.body;

    console.log('Creating order with razorpay instance:', !!razorpay);

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid, positive amount is required.'
      });
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // Convert to paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1 // Auto capture
    };

    console.log('Order options:', options);

    let order;

    if (!razorpay) {
      console.log('Using mock order because razorpay instance is null');
      order = {
        id: `order_mock_${Date.now()}`,
        amount: options.amount,
        currency,
        receipt: receipt || `mock_${Date.now()}`,
      };
    } else {
      console.log('Creating real Razorpay order');
      try {
        order = await razorpay.orders.create(options);
        console.log('Real order created:', order);
      } catch (razorpayError) {
        console.error('Razorpay order creation failed:', razorpayError);
        console.log('Falling back to mock order');
        order = {
          id: `order_mock_${Date.now()}`,
          amount: Math.round(amount * 100),
          currency,
          receipt: receipt || `mock_${Date.now()}`,
        };
      }
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order'
    });
  }
};

// Verify Razorpay payment
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing payment verification data'
      });
    }

    let isAuthentic = true;

    if (!shouldMockRazorpay) {
      try {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest('hex');

        isAuthentic = expectedSignature === razorpay_signature;
        console.log('Signature verification:', isAuthentic ? 'SUCCESS' : 'FAILED');
      } catch (cryptoError) {
        console.error('Crypto error during signature verification:', cryptoError);
        isAuthentic = false;
      }
    } else {
      console.warn('⚠️  Skipping Razorpay signature verification (mock mode).');
    }

    if (isAuthentic) {
      // Payment is authentic
      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          razorpay_payment_id,
          razorpay_order_id
        }
      });
    } else {
      // Payment verification failed
      res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }
  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment'
    });
  }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured'
      });
    }

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details'
    });
  }
};

// Get user payments
export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 10, page = 1, status } = req.query;

    // Get user's bookings
    const userBookings = await Booking.find({ created_by: userId }).select('_id');
    const bookingIds = userBookings.map(booking => booking._id);

    const filter = { booking_id: { $in: bookingIds } };
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .populate('booking_id')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ payment_date: -1 })
      .lean();

    const total = await Payment.countDocuments(filter);

    // Calculate payment statistics
    const stats = await Payment.aggregate([
      { $match: { booking_id: { $in: bookingIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total_amount: { $sum: '$amount' }
        }
      }
    ]);

    const totalAmount = await Payment.aggregate([
      { $match: { booking_id: { $in: bookingIds }, status: 'success' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        statistics: {
          total_payments: total,
          total_spent: totalAmount[0]?.total || 0,
          by_status: stats
        }
      }
    });
  } catch (error) {
    console.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payments'
    });
  }
};

// Initiate refund
export const initiateRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, speed = 'normal', notes } = req.body;

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured'
      });
    }

    // First, get payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'captured') {
      return res.status(400).json({
        success: false,
        message: 'Only captured payments can be refunded'
      });
    }

    const refundAmount = amount ? Math.round(amount * 100) : payment.amount;
    
    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed payment amount'
      });
    }

    const refundOptions = {
      payment_id: paymentId,
      amount: refundAmount,
      speed: speed,
      notes: notes || { reason: 'Customer requested refund' }
    };

    const refund = await razorpay.payments.refund(refundOptions);

    // Update our payment record
    await Payment.findOneAndUpdate(
      { razorpay_payment_id: paymentId },
      {
        status: refundAmount === payment.amount ? 'refunded' : 'partially_refunded',
        refund_amount: refundAmount / 100,
        refund_date: new Date()
      }
    );

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      data: refund
    });
  } catch (error) {
    console.error('Initiate refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating refund'
    });
  }
};

// Get refund details
export const getRefundDetails = async (req, res) => {
  try {
    const { refundId } = req.params;

    const razorpay = getRazorpay();
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay is not configured'
      });
    }

    const refund = await razorpay.refunds.fetch(refundId);

    res.json({
      success: true,
      data: refund
    });
  } catch (error) {
    console.error('Get refund details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching refund details'
    });
  }
};

// Get payment methods
export const getPaymentMethods = async (req, res) => {
  try {
    // This would typically come from Razorpay or your payment gateway
    const paymentMethods = [
      {
        id: 'razorpay',
        name: 'Razorpay',
        methods: [
          {
            id: 'card',
            name: 'Credit/Debit Card',
            description: 'Pay with Visa, MasterCard, Rupay',
            icon: 'credit-card',
            supported_cards: ['visa', 'mastercard', 'rupay']
          },
          {
            id: 'upi',
            name: 'UPI',
            description: 'Pay using UPI ID or QR Code',
            icon: 'smartphone',
            supported_apps: ['gpay', 'phonepe', 'paytm', 'bhim']
          },
          {
            id: 'netbanking',
            name: 'Net Banking',
            description: 'Pay using your bank account',
            icon: 'bank',
            supported_banks: ['sbi', 'hdfc', 'icici', 'axis', 'kotak']
          },
          {
            id: 'wallet',
            name: 'Wallet',
            description: 'Pay from your TicketHub wallet',
            icon: 'wallet',
            min_balance: 0
          }
        ]
      }
    ];

    res.json({
      success: true,
      data: paymentMethods
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment methods'
    });
  }
};
