import mongoose from 'mongoose';

const busSchema = new mongoose.Schema({
  operator: {
    type: String,
    required: [true, 'Operator is required'],
    trim: true
  },
  bus_number: {
    type: String,
    required: [true, 'Bus number is required'],
    trim: true,
    uppercase: true
  },
  bus_type: {
    type: String,
    enum: ['ac_sleeper', 'non_ac_sleeper', 'ac_seater', 'non_ac_seater', 'luxury', 'volvo'],
    required: [true, 'Bus type is required']
  },
  from_city: {
    type: String,
    required: [true, 'From city is required'],
    trim: true
  },
  to_city: {
    type: String,
    required: [true, 'To city is required'],
    trim: true
  },
  departure_date: {
    type: Date,
    required: [true, 'Departure date is required']
  },
  departure_time: {
    type: String,
    required: [true, 'Departure time is required']
  },
  arrival_time: {
    type: String,
    required: [true, 'Arrival time is required']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required']
  },
  total_seats: {
    type: Number,
    required: [true, 'Total seats is required'],
    min: [1, 'Total seats must be at least 1']
  },
  available_seats: {
    type: Number,
    required: [true, 'Available seats is required'],
    min: [0, 'Available seats cannot be negative']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  amenities: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'full', 'cancelled', 'departed'],
    default: 'active'
  },
  boarding_point: {
    type: String,
    required: [true, 'Boarding point is required']
  },
  dropping_point: {
    type: String,
    required: [true, 'Dropping point is required']
  },
  bus_layout: {
    type: String,
    enum: ['2x2', '2x1', 'sleeper'],
    default: '2x2'
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
busSchema.index({ from_city: 1, to_city: 1, departure_date: 1 });
busSchema.index({ operator: 1, status: 1 });
busSchema.index({ bus_type: 1 });

// Virtual for checking if bus is full
busSchema.virtual('is_full').get(function() {
  return this.available_seats === 0;
});

// Method to check seat availability
busSchema.methods.hasAvailableSeats = function(requiredSeats = 1) {
  return this.available_seats >= requiredSeats;
};

export default mongoose.model('Bus', busSchema);