import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  booking_type: {
    type: String,
    enum: ['movie', 'bus', 'event', 'tour', 'train', 'flight'],
    required: [true, 'Booking type is required']
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Item ID is required'],
    refPath: 'booking_type_model'
  },
  item_title: {
    type: String,
    required: [true, 'Item title is required'],
    trim: true
  },
  booking_date: {
    type: Date,
    default: Date.now
  },
  event_date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  event_time: {
    type: String,
    required: [true, 'Event time is required']
  },
  seats: [{
    type: String,
    trim: true
  }],
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  passenger_details: [{
    name: {
      type: String,
      required: [true, 'Passenger name is required'],
      trim: true
    },
    age: {
      type: Number,
      required: [true, 'Passenger age is required'],
      min: [0, 'Age cannot be negative']
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: [true, 'Gender is required']
    },
    phone: {
      type: String,
      trim: true
    },
    id_proof: {
      type: String,
      trim: true
    }
  }],
  subtotal: {
    type: Number,
    default: 0,
    min: [0, 'Subtotal cannot be negative']
  },
  booking_fee: {
    type: Number,
    default: 0,
    min: [0, 'Booking fee cannot be negative']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative']
  },
  total_amount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  payment_status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  booking_status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'],
    default: 'pending'
  },
  qr_code_url: {
    type: String,
    default: null
  },
  booking_reference: {
    type: String,
    unique: true,
    trim: true
  },
  venue_details: {
    type: String,
    required: [true, 'Venue details are required'],
    trim: true
  },
  cancellation_reason: {
    type: String,
    trim: true
  },
  cancellation_date: {
    type: Date,
    default: null
  },
  refund_amount: {
    type: Number,
    default: 0,
    min: [0, 'Refund amount cannot be negative']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  },
  special_requirements: {
    type: String,
    trim: true,
    maxlength: [500, 'Special requirements cannot be more than 500 characters']
  },
  class_type: {
    type: String,
    trim: true
  },
  payment_method: {
    type: String,
    enum: ['razorpay', 'wallet', 'card', 'upi', 'netbanking'],
    default: 'razorpay'
  },
  razorpay_payment_id: {
    type: String,
    trim: true
  },
  razorpay_order_id: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ created_by: 1, booking_date: -1 });
bookingSchema.index({ booking_reference: 1 });
bookingSchema.index({ booking_type: 1, item_id: 1 });
bookingSchema.index({ payment_status: 1, booking_status: 1 });
bookingSchema.index({ event_date: 1 });

// Generate booking reference before saving
bookingSchema.pre('save', function(next) {
  if (!this.booking_reference) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    this.booking_reference = `BK${timestamp}${random}`;
  }
  next();
});

// Virtual for formatted booking date
bookingSchema.virtual('formatted_booking_date').get(function() {
  return this.booking_date.toLocaleDateString('en-IN');
});

// Virtual for formatted event date
bookingSchema.virtual('formatted_event_date').get(function() {
  return this.event_date.toLocaleDateString('en-IN');
});

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const eventDateTime = new Date(this.event_date);
  const timeDiff = eventDateTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return this.booking_status === 'confirmed' && hoursDiff > 24; // Can cancel up to 24 hours before
};

// Method to calculate refund amount
bookingSchema.methods.calculateRefund = function() {
  if (!this.canBeCancelled()) {
    return 0;
  }
  
  const now = new Date();
  const eventDateTime = new Date(this.event_date);
  const timeDiff = eventDateTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  if (hoursDiff > 72) { // More than 3 days
    return this.total_amount * 0.9; // 90% refund
  } else if (hoursDiff > 48) { // 2-3 days
    return this.total_amount * 0.75; // 75% refund
  } else if (hoursDiff > 24) { // 1-2 days
    return this.total_amount * 0.5; // 50% refund
  }
  
  return 0; // No refund within 24 hours
};

export default mongoose.model('Booking', bookingSchema);