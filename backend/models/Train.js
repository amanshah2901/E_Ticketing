import mongoose from 'mongoose';

const trainSchema = new mongoose.Schema({
  train_number: {
    type: String,
    required: [true, 'Train number is required'],
    trim: true,
    uppercase: true
  },
  train_name: {
    type: String,
    required: [true, 'Train name is required'],
    trim: true
  },
  operator: {
    type: String,
    required: [true, 'Operator is required'],
    trim: true
  },
  train_type: {
    type: String,
    enum: ['express', 'superfast', 'mail', 'passenger', 'rajdhani', 'shatabdi', 'duronto', 'garib_rath'],
    required: [true, 'Train type is required']
  },
  from_station: {
    type: String,
    required: [true, 'From station is required'],
    trim: true
  },
  to_station: {
    type: String,
    required: [true, 'To station is required'],
    trim: true
  },
  from_station_code: {
    type: String,
    required: [true, 'From station code is required'],
    trim: true,
    uppercase: true,
    maxlength: 5
  },
  to_station_code: {
    type: String,
    required: [true, 'To station code is required'],
    trim: true,
    uppercase: true,
    maxlength: 5
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
      enum: ['1A', '2A', '3A', 'SL', 'CC', 'EC', '2S'],
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
  amenities: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['active', 'full', 'cancelled', 'departed'],
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
trainSchema.index({ from_station_code: 1, to_station_code: 1, departure_date: 1 });
trainSchema.index({ operator: 1, status: 1 });
trainSchema.index({ train_type: 1 });

// Virtual for checking if train is full
trainSchema.virtual('is_full').get(function() {
  return this.classes.every(cls => cls.available_seats === 0);
});

// Method to check seat availability for a class
trainSchema.methods.hasAvailableSeats = function(classType, requiredSeats = 1) {
  const trainClass = this.classes.find(c => c.class_type === classType);
  return trainClass ? trainClass.available_seats >= requiredSeats : false;
};

// Method to get price for a class
trainSchema.methods.getClassPrice = function(classType) {
  const trainClass = this.classes.find(c => c.class_type === classType);
  return trainClass ? trainClass.price : 0;
};

export default mongoose.model('Train', trainSchema);



