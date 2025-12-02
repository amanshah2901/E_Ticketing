// backend/models/ShowInstance.js
import mongoose from 'mongoose';

const showInstanceSchema = new mongoose.Schema({
  movie_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: [true, 'Movie ID is required'],
    index: true
  },
  theatre: { type: String, required: true, trim: true },
  theatre_address: { type: String, trim: true, default: '' },
  date: { type: Date, required: true, index: true },
  time: { type: String, required: true },
  location: { type: String, trim: true, default: '' }, // city/area
  base_price: { type: Number, default: 0 },
  total_seats: { type: Number, required: true, min: 1 },
  available_seats: { type: Number, required: true, min: 0 },
  metadata: { type: Object, default: {} },
  status: {
    type: String,
    enum: ['active', 'sold_out', 'cancelled', 'upcoming'],
    default: 'active'
  }
}, { timestamps: true });

showInstanceSchema.index({ movie_id: 1, date: 1, time: 1 }, { unique: true });

export default mongoose.model('ShowInstance', showInstanceSchema);
