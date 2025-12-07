import mongoose from 'mongoose';

const flightSchema = new mongoose.Schema({
  flight_number: {
    type: String,
    required: [true, 'Flight number is required'],
    trim: true,
    uppercase: true
  },
  airline: {
    type: String,
    required: [true, 'Airline is required'],
    trim: true
  },
  aircraft_type: {
    type: String,
    trim: true
  },
  from_airport: {
    type: String,
    required: [true, 'From airport is required'],
    trim: true
  },
  to_airport: {
    type: String,
    required: [true, 'To airport is required'],
    trim: true
  },
  from_airport_code: {
    type: String,
    required: [true, 'From airport code is required'],
    trim: true,
    uppercase: true,
    maxlength: 3
  },
  to_airport_code: {
    type: String,
    required: [true, 'To airport code is required'],
    trim: true,
    uppercase: true,
    maxlength: 3
  },
  departure_date: {
    type: Date,
    required: [true, 'Departure date is required']
  },
  departure_time: {
    type: String,
    required: [true, 'Departure time is required']
  },
  arrival_date: {
    type: Date,
    required: [true, 'Arrival date is required']
  },
  arrival_time: {
    type: String,
    required: [true, 'Arrival time is required']
  },
  duration: {
    type: String,
    required: [true, 'Duration is required']
  },
  classes: [{
    class_type: {
      type: String,
      enum: ['economy', 'premium_economy', 'business', 'first'],
      required: true
    },
    total_seats: {
      type: Number,
      required: true,
      min: 1
    },
    available_seats: {
      type: Number,
      required: true,
      min: 0
    },
    price: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  stops: {
    type: Number,
    default: 0,
    min: 0
  },
  amenities: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'full', 'cancelled', 'departed', 'delayed'],
    default: 'active'
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
  },
  image_url: {
    type: String,
    default: null,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes
flightSchema.index({ from_airport_code: 1, to_airport_code: 1, departure_date: 1 });
flightSchema.index({ airline: 1, status: 1 });
flightSchema.index({ flight_number: 1 });

// Virtual for checking if flight is full
flightSchema.virtual('is_full').get(function() {
  return this.classes.every(cls => cls.available_seats === 0);
});

// Method to check seat availability for a class
flightSchema.methods.hasAvailableSeats = function(classType, requiredSeats = 1) {
  const flightClass = this.classes.find(c => c.class_type === classType);
  return flightClass ? flightClass.available_seats >= requiredSeats : false;
};

// Method to get price for a class
flightSchema.methods.getClassPrice = function(classType) {
  const flightClass = this.classes.find(c => c.class_type === classType);
  return flightClass ? flightClass.price : 0;
};

export default mongoose.model('Flight', flightSchema);



