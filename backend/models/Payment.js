import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  booking_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: [true, 'Booking ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  payment_method: {
    type: String,
    enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'wallet', 'razorpay'],
    required: [true, 'Payment method is required']
  },
  transaction_id: {
    type: String,
    required: [true, 'Transaction ID is required'],
    trim: true,
    unique: true
  },
  gateway: {
    type: String,
    required: [true, 'Gateway is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  payment_date: {
    type: Date,
    default: Date.now
  },
  refund_amount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  refund_date: {
    type: Date,
    default: null
  },
  razorpay_payment_id: {
    type: String,
    trim: true
  },
  razorpay_order_id: {
    type: String,
    trim: true
  },
  razorpay_signature: {
    type: String,
    trim: true
  },
  bank_name: {
    type: String,
    trim: true
  },
  card_last4: {
    type: String,
    trim: true,
    maxlength: 4
  },
  upi_id: {
    type: String,
    trim: true
  },
  wallet_type: {
    type: String,
    trim: true
  },
  failure_reason: {
    type: String,
    trim: true
  },
  gateway_response: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ booking_id: 1 });
paymentSchema.index({ transaction_id: 1 });
paymentSchema.index({ status: 1, payment_date: -1 });
paymentSchema.index({ razorpay_payment_id: 1 });

// Virtual for formatted payment date
paymentSchema.virtual('formatted_payment_date').get(function() {
  return this.payment_date.toLocaleDateString('en-IN');
});

// Virtual for formatted amount
paymentSchema.virtual('formatted_amount').get(function() {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: this.currency
  }).format(this.amount);
});

// Method to check if payment can be refunded
paymentSchema.methods.canBeRefunded = function() {
  return this.status === 'success' && this.refund_amount === 0;
};

export default mongoose.model('Payment', paymentSchema);