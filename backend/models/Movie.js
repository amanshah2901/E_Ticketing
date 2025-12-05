import mongoose from 'mongoose';

/* ---------------------------------------------
   Showtime Sub-Schemas
--------------------------------------------- */

// single timeslot → "10:00 AM", price: 250
const showtimeSlotSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },
    price: { type: Number, default: 0 }
  },
  { _id: false }
);

// One showtime entry → Theatre + Date + List of Timeslots
const showtimeSchema = new mongoose.Schema(
  {
    theatre: { type: String, required: true },
    theatre_address: { type: String, default: "" },

    // bookmyshow style multiple dates
    date: { type: Date, required: true },

    // city (optional)
    location: { type: String, trim: true, default: "" },

    // timeslot buttons (BookMyShow)
    timeslots: [showtimeSlotSchema],

    metadata: { type: Object, default: {} }
  },
  { timestamps: true }
);

/* ---------------------------------------------
   Main Movie Schema
--------------------------------------------- */

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Movie title is required"],
      trim: true,
      maxlength: [200, "Title cannot be more than 200 characters"]
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot be more than 1000 characters"]
    },

    genre: {
      type: String,
      required: [true, "Genre is required"],
      trim: true
    },

    duration: {
      type: Number,
      required: [true, "Duration is required"],
      min: [1, "Duration must be at least 1 minute"]
    },

    language: {
      type: String,
      required: [true, "Language is required"],
      trim: true
    },

    rating: {
      type: String,
      enum: ["U", "UA", "A", "R"],
      required: [true, "Rating is required"]
    },

    poster_url: { type: String, default: null },
    trailer_url: { type: String, default: null },

    /** Legacy fields (backward compatibility) */
    theater: {
      type: String,
      required: [true, "Theater is required"],
      trim: true
    },

    theater_address: { type: String, trim: true },

    show_date: {
      type: Date,
      required: [true, "Show date is required"]
    },

    show_time: {
      type: String,
      required: [true, "Show time is required"]
    },

    total_seats: {
      type: Number,
      required: [true, "Total seats is required"],
      min: [1, "Total seats must be at least 1"]
    },

    available_seats: {
      type: Number,
      required: [true, "Available seats is required"],
      min: [0, "Available seats cannot be negative"]
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"]
    },

    status: {
      type: String,
      enum: ["active", "sold_out", "cancelled", "upcoming"],
      default: "active"
    },

    imdb_id: { type: String, trim: true },
    imdb_rating: { type: Number, min: 0, max: 10, default: 0 },

    director: { type: String, trim: true },

    cast: [
      {
        type: String,
        trim: true
      }
    ],

    featured: { type: Boolean, default: false },

    /* -----------------------------------------
       NEW BOOKMYSHOW-STYLE SHOWTIMES SYSTEM
    ------------------------------------------ */
    showtimes: [showtimeSchema]
  },
  { timestamps: true }
);

/* ---------------------------------------------
   Indexes
--------------------------------------------- */
movieSchema.index({ status: 1, show_date: 1 });
movieSchema.index({ theatre: 1, show_date: 1 });
movieSchema.index({ featured: 1 });
movieSchema.index({ genre: 1 });
// Text index removed - MongoDB doesn't support Hindi language override
// Use regex search instead for better language support
// movieSchema.index({ title: "text", genre: "text" });

/* ---------------------------------------------
   Virtuals
--------------------------------------------- */

// auto sold out
movieSchema.virtual("is_sold_out").get(function () {
  return this.available_seats === 0;
});

/* ---------------------------------------------
   Methods
--------------------------------------------- */

// check if required seats available
movieSchema.methods.hasAvailableSeats = function (requiredSeats = 1) {
  return this.available_seats >= requiredSeats;
};

export default mongoose.model("Movie", movieSchema);
