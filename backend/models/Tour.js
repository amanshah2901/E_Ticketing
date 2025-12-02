import mongoose from 'mongoose';

const tourSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Tour title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [3000, 'Description cannot be more than 3000 characters']
  },
  destination: {
    type: String,
    required: [true, 'Destination is required'],
    trim: true
  },
  duration: {
    type: String,
    required: [true, 'Duration is required']
  },
  start_date: {
    type: Date,
    required: [true, 'Start date is required']
  },
  end_date: {
    type: Date,
    required: [true, 'End date is required']
  },
  image_url: {
    type: String,
    default: null
  },
  gallery: [{
    type: String
  }],
  inclusions: [{
    type: String,
    trim: true
  }],
  exclusions: [{
    type: String,
    trim: true
  }],
  itinerary: [{
    day: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    meals: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'all', 'none'],
      default: 'none'
    }
  }],
  price_per_person: {
    type: Number,
    required: [true, 'Price per person is required'],
    min: [0, 'Price cannot be negative']
  },
  max_capacity: {
    type: Number,
    required: [true, 'Max capacity is required'],
    min: [1, 'Max capacity must be at least 1']
  },
  available_slots: {
    type: Number,
    required: [true, 'Available slots is required'],
    min: [0, 'Available slots cannot be negative']
  },
  difficulty_level: {
    type: String,
    enum: ['easy', 'moderate', 'challenging', 'difficult'],
    default: 'moderate'
  },
  tour_operator: {
    type: String,
    required: [true, 'Tour operator is required'],
    trim: true
  },
  operator_contact: {
    email: String,
    phone: String,
    website: String
  },
  status: {
    type: String,
    enum: ['available', 'filling_fast', 'sold_out', 'cancelled', 'completed'],
    default: 'available'
  },
  tour_type: {
    type: String,
    enum: ['adventure', 'cultural', 'religious', 'beach', 'mountain', 'wildlife', 'city'],
    default: 'cultural'
  },
  accommodation: {
    type: String,
    enum: ['hotel', 'resort', 'camping', 'homestay', 'luxury'],
    default: 'hotel'
  },
  transport: {
    type: String,
    default: 'AC Vehicle'
  },
  guide: {
    type: Boolean,
    default: true
  },
  meals: {
    type: String,
    enum: ['all', 'some', 'none'],
    default: 'some'
  },
  highlights: [{
    type: String,
    trim: true
  }],
  requirements: [{
    type: String,
    trim: true
  }],
  cancellation_policy: {
    type: String,
    default: 'Standard cancellation policy applies'
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
tourSchema.index({ destination: 1, start_date: 1 });
tourSchema.index({ tour_type: 1, status: 1 });
tourSchema.index({ difficulty_level: 1 });
tourSchema.index({ tour_operator: 1 });

// Virtual for checking if tour is sold out
tourSchema.virtual('is_sold_out').get(function() {
  return this.available_slots === 0;
});

// Virtual for checking if tour is filling fast
tourSchema.virtual('is_filling_fast').get(function() {
  return this.available_slots <= (this.max_capacity * 0.2); // 20% or less slots left
});

// Method to check slot availability
tourSchema.methods.hasAvailableSlots = function(requiredSlots = 1) {
  return this.available_slots >= requiredSlots;
};

export default mongoose.model('Tour', tourSchema);