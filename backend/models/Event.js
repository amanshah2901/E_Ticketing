import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  category: {
    type: String,
    enum: ['concert', 'sports', 'theater', 'comedy', 'festival', 'conference', 'workshop', 'exhibition', 'other'],
    required: [true, 'Category is required']
  },
  venue: {
    type: String,
    required: [true, 'Venue is required'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  event_date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  event_time: {
    type: String,
    required: [true, 'Event time is required']
  },
  duration: {
    type: String,
    default: '2-3 hours'
  },
  image_url: {
    type: String,
    default: null
  },
  total_tickets: {
    type: Number,
    required: [true, 'Total tickets is required'],
    min: [1, 'Total tickets must be at least 1']
  },
  available_tickets: {
    type: Number,
    required: [true, 'Available tickets is required'],
    min: [0, 'Available tickets cannot be negative']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  organizer: {
    type: String,
    required: [true, 'Organizer is required'],
    trim: true
  },
  organizer_contact: {
    email: String,
    phone: String,
    website: String
  },
  status: {
    type: String,
    enum: ['upcoming', 'sold_out', 'cancelled', 'completed', 'postponed'],
    default: 'upcoming'
  },
  event_type: {
    type: String,
    enum: ['indoor', 'outdoor', 'virtual', 'hybrid'],
    default: 'indoor'
  },
  age_restriction: {
    type: String,
    enum: ['all', '18+', '21+', '16+'],
    default: 'all'
  },
  tags: [{
    type: String,
    trim: true
  }],
  featured: {
    type: Boolean,
    default: false
  },
  terms_conditions: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
eventSchema.index({ category: 1, event_date: 1 });
eventSchema.index({ city: 1, status: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ featured: 1 });

// Virtual for checking if event is sold out
eventSchema.virtual('is_sold_out').get(function() {
  return this.available_tickets === 0;
});

// Method to check ticket availability
eventSchema.methods.hasAvailableTickets = function(requiredTickets = 1) {
  return this.available_tickets >= requiredTickets;
};

export default mongoose.model('Event', eventSchema);