import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
  wallet_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: [true, 'Wallet ID is required']
  },
  transaction_type: {
    type: String,
    enum: ['credit', 'debit', 'refund'],
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  booking_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'failed', 'cancelled'],
    default: 'completed'
  },
  balance_after: {
    type: Number,
    required: [true, 'Balance after is required'],
    min: [0, 'Balance cannot be negative']
  },
  reference_id: {
    type: String,
    trim: true,
    unique: true
  },
  gateway_transaction_id: {
    type: String,
    trim: true
  },
  failure_reason: {
    type: String,
    trim: true
  }
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" }   // ★ FIXED ★
});

// Indexes
walletTransactionSchema.index({ wallet_id: 1, created_at: -1 });
walletTransactionSchema.index({ transaction_type: 1 });
walletTransactionSchema.index({ reference_id: 1 });
walletTransactionSchema.index({ booking_id: 1 });

// Generate reference ID before saving
walletTransactionSchema.pre('save', function(next) {
  if (!this.reference_id) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.reference_id = `WT${timestamp}${random}`;
  }
  next();
});

// Virtuals
walletTransactionSchema.virtual('formatted_amount').get(function() {
  const sign = this.transaction_type === 'credit' ? '+' : '-';
  return `${sign}${new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(this.amount)}`;
});

walletTransactionSchema.virtual('formatted_date').get(function() {
  return this.created_at.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

export default mongoose.model('WalletTransaction', walletTransactionSchema);
