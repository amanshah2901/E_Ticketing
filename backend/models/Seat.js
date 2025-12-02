import mongoose from "mongoose";

const seatSchema = new mongoose.Schema(
  {
    // movie or bus
    item_type: {
      type: String,
      enum: ["movie", "bus", "show"],
      required: [true, "Item type is required"],
    },

    // associated movieId or busId
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Item ID is required"],
      refPath: "item_type",
    },

    // e.g. A1, B4, U5, 12 etc
    seat_number: {
      type: String,
      required: [true, "Seat number is required"],
      trim: true,
    },

    // A, B, C → for movies
    // For buses, row can be 1, 2 or sleeper L1, U1
    row: {
      type: String,
      required: [true, "Row is required"],
      trim: true,
      uppercase: true,
    },

    // Column number
    column: {
      type: Number,
      required: [true, "Column is required"],
      min: [1, "Column must be at least 1"],
    },

    // seat classification
    seat_type: {
      type: String,
      enum: [
        "regular",
        "premium",
        "vip",
        "sleeper",
        "window",
        "aisle",
        "emergency_exit",
      ],
      required: [true, "Seat type is required"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    status: {
      type: String,
      enum: ["available", "booked", "blocked", "unavailable", "selected"],
      default: "available",
    },

    booked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    // seat locking so two people can't select same seat
    locked_until: {
      type: Date,
      default: null,
    },

    locked_by: {
      type: String,
      default: null,
    },

    // extra features (e.g. legroom, pushback, recliner)
    features: [
      {
        type: String,
        trim: true,
      },
    ],

    // seat position for drawing maps in future customization
    position: {
      x: Number,
      y: Number,
    },
  },
  { timestamps: true }
);

/* ------------------- INDEXES ------------------- */

// unique seat per movie/bus
seatSchema.index(
  { item_type: 1, item_id: 1, seat_number: 1 },
  { unique: true }
);

seatSchema.index({ item_type: 1, item_id: 1, status: 1 });
seatSchema.index({ item_type: 1, item_id: 1, row: 1, column: 1 });
seatSchema.index({ locked_until: 1 });

/* ------------------- VIRTUALS ------------------- */

seatSchema.virtual("is_locked").get(function () {
  return this.locked_until && this.locked_until > new Date();
});

seatSchema.virtual("is_available").get(function () {
  return this.status === "available" && !this.is_locked;
});

/* ------------------- METHODS ------------------- */

// lock seat temporarily
seatSchema.methods.lockSeat = function (userId, durationMinutes = 10) {
  this.status = "selected";
  this.locked_by = userId;
  this.locked_until = new Date(Date.now() + durationMinutes * 60 * 1000);
  return this.save();
};

// unlock seat
seatSchema.methods.unlockSeat = function () {
  if (this.status === "selected") {
    this.status = "available";
  }
  this.locked_by = null;
  this.locked_until = null;
  return this.save();
};

// book seat
seatSchema.methods.bookSeat = function (userId, bookingId) {
  this.status = "booked";
  this.booked_by = userId;
  this.booking_id = bookingId;
  this.locked_by = null;
  this.locked_until = null;
  return this.save();
};

// unlock expired seats
seatSchema.statics.cleanupExpiredLocks = async function () {
  return this.updateMany(
    {
      locked_until: { $lt: new Date() },
      status: "selected",
    },
    {
      $set: {
        status: "available",
        locked_by: null,
        locked_until: null,
      },
    }
  );
};

export default mongoose.model("Seat", seatSchema);

