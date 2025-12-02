
// controllers/bookingController.js
import Booking from '../models/Booking.js';
import Movie from '../models/Movie.js';
import Bus from '../models/Bus.js';
import Event from '../models/Event.js';
import Tour from '../models/Tour.js';
import Seat from '../models/Seat.js';
import Payment from '../models/Payment.js';
import Wallet from '../models/Wallet.js';
import WalletTransaction from '../models/WalletTransaction.js';
import Notification from '../models/Notification.js';
import QRCode from 'qrcode';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create booking (with wallet + razorpay support)
 */
export const createBooking = async (req, res) => {
  try {
    const {
      booking_type,
      item_id,
      quantity,
      seats,
      passenger_details,
      special_requirements,
      payment_method,
      razorpay_payment_id,
      razorpay_order_id
    } = req.body;

    const userId = req.user._id;

    if (!booking_type || !item_id) {
      return res.status(400).json({ success: false, message: 'booking_type and item_id are required' });
    }

    let item;
    let itemTitle = '';
    let eventDate = null;
    let eventTime = null;
    let venueDetails = '';
    let totalAmount = 0;
    let quantityToUse = parseInt(quantity || 0, 10);

    switch (booking_type) {
      case 'movie': {
        item = await Movie.findById(item_id);
        if (!item) return res.status(404).json({ success: false, message: 'Movie not found' });

        if (!quantityToUse) quantityToUse = seats?.length || 1;
        if (!item.hasAvailableSeats(quantityToUse)) {
          return res.status(400).json({ success: false, message: 'Not enough seats available' });
        }

        itemTitle = item.title;
        eventDate = item.show_date;
        eventTime = item.show_time;
        venueDetails = item.theater || '';
        totalAmount = (item.price || 0) * quantityToUse;
        break;
      }

      case 'bus': {
        item = await Bus.findById(item_id);
        if (!item) return res.status(404).json({ success: false, message: 'Bus not found' });

        if (!Array.isArray(seats) || seats.length === 0) {
          return res.status(400).json({ success: false, message: 'Bus seats are required' });
        }

        if (!item.hasAvailableSeats(seats.length)) {
          return res.status(400).json({ success: false, message: 'Not enough seats available' });
        }

        itemTitle = `${item.from_city} to ${item.to_city}`;
        eventDate = item.departure_date;
        eventTime = item.departure_time;
        venueDetails = `${item.operator || ''} - ${item.boarding_point || ''}`;

        const seatDocs = await Seat.find({
          item_type: 'bus',
          item_id: item_id,
          seat_number: { $in: seats }
        }).select('price');

        if (!seatDocs || seatDocs.length !== seats.length) {
          return res.status(400).json({ success: false, message: 'Selected seats not found or mismatch' });
        }

        totalAmount = seatDocs.reduce((sum, s) => sum + (s.price || 0), 0);
        quantityToUse = seats.length;
        break;
      }

      case 'event': {
        item = await Event.findById(item_id);
        if (!item) return res.status(404).json({ success: false, message: 'Event not found' });

        if (!quantityToUse) quantityToUse = 1;
        if (!item.hasAvailableTickets(quantityToUse)) {
          return res.status(400).json({ success: false, message: 'Not enough tickets available' });
        }

        itemTitle = item.title;
        eventDate = item.event_date;
        eventTime = item.event_time;
        venueDetails = `${item.venue || ''}, ${item.city || ''}`;
        totalAmount = item.price * quantityToUse;
        break;
      }

      case 'tour': {
        item = await Tour.findById(item_id);
        if (!item) return res.status(404).json({ success: false, message: 'Tour not found' });

        if (!quantityToUse) quantityToUse = 1;
        if (!item.hasAvailableSlots(quantityToUse)) {
          return res.status(400).json({ success: false, message: 'Not enough slots available' });
        }

        itemTitle = item.title;
        eventDate = item.start_date;
        eventTime = 'Check itinerary';
        venueDetails = item.destination || '';
        totalAmount = (item.price_per_person || 0) * quantityToUse;
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid booking type' });
    }

    const bookingFee = totalAmount * 0.05;
    const tax = totalAmount * 0.05;
    const grandTotal = Number((totalAmount + bookingFee + tax).toFixed(2));

    // Ensure wallet has balance before creating booking
    if (payment_method === 'wallet') {
      const wallet = await Wallet.findOne({ user_id: userId });
      if (!wallet || !wallet.hasSufficientBalance(grandTotal)) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
    }

    const bookingData = {
      booking_type,
      item_id,
      item_title: itemTitle,
      event_date: eventDate,
      event_time: eventTime,
      quantity: quantityToUse,
      seats: seats || [],
      passenger_details: passenger_details || [],
      total_amount: grandTotal,
      payment_status: 'completed',
      booking_status: 'confirmed',
      venue_details: venueDetails,
      created_by: userId,
      special_requirements,
      payment_method,
      razorpay_payment_id,
      razorpay_order_id
    };

    const booking = new Booking(bookingData);
    await booking.save();

    try {
      const qrPayload = {
        booking_id: booking._id,
        booking_reference: booking.booking_reference,
        item_title: itemTitle,
        event_date: eventDate,
        event_time: eventTime,
        venue: venueDetails
      };

      const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrPayload));
      booking.qr_code_url = qrCodeUrl;
      await booking.save();
    } catch (qrErr) {
      console.warn("QR creation failed:", qrErr);
    }

    // Update availability
    if (booking_type === 'movie') {
      await Movie.findByIdAndUpdate(item_id, { $inc: { available_seats: -quantityToUse } });
    } else if (booking_type === 'bus') {
      await Bus.findByIdAndUpdate(item_id, { $inc: { available_seats: -seats.length } });
      await Seat.updateMany(
        { item_type: 'bus', item_id, seat_number: { $in: seats } },
        { $set: { status: 'booked', booked_by: userId, booking_id: booking._id } }
      );
    } else if (booking_type === 'event') {
      await Event.findByIdAndUpdate(item_id, { $inc: { available_tickets: -quantityToUse } });
    } else if (booking_type === 'tour') {
      await Tour.findByIdAndUpdate(item_id, { $inc: { available_slots: -quantityToUse } });
    }


    // ------------------------
    // PAYMENT CREATION
    // ------------------------
    const payment = new Payment({
      booking_id: booking._id,
      amount: grandTotal,
      currency: "INR",
      payment_method,
      transaction_id: razorpay_payment_id || `TXN${Date.now()}`,
      gateway: payment_method === "wallet" ? "Wallet" : "Razorpay",
      status: "success",
      razorpay_payment_id,
      razorpay_order_id,
    });

    await payment.save();

    // ------------------------
    // WALLET DEDUCTION LOGIC
    // ------------------------
    if (payment_method === "wallet") {
      const wallet = await Wallet.findOne({ user_id: userId });

      if (!wallet) {
        return res.status(500).json({
          success: false,
          message: "Wallet not found while processing payment.",
        });
      }

      // Deduct balance
      await wallet.deductFunds(grandTotal);

      // Create wallet transaction (reference_id auto-generated by schema)
      const walletTransaction = new WalletTransaction({
        wallet_id: wallet._id,
        transaction_type: "debit",
        amount: grandTotal,
        description: `Payment for booking ${booking.booking_reference}`,
        booking_id: booking._id,
        balance_after: wallet.balance,
        status: "completed",
      });

      await walletTransaction.save();
    }

    // ------------------------
    // NOTIFICATION
    // ------------------------
    try {
      await Notification.createNotification(userId, {
        title: "Booking Confirmed",
        message: `Your booking for ${itemTitle} is confirmed! Ref: ${booking.booking_reference}`,
        type: "booking",
        booking_id: booking._id,
        action_url: `/bookings/${booking._id}`,
        icon: "check-circle",
        is_important: true,
      });
    } catch (notifErr) {
      console.warn("Notification error:", notifErr);
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate("item_id")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Booking created successfully",
      data: populatedBooking,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    if (error?.name === "ValidationError") {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, message: "Validation failed", errors });
    }

    return res.status(500).json({
      success: false,
      message: "Error creating booking",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * GET USER BOOKINGS
 * ============================================
 */
export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      limit = 10,
      page = 1,
      status,
      booking_type,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filter = { created_by: userId };
    if (status && status !== "all") filter.booking_status = status;
    if (booking_type && booking_type !== "all")
      filter.booking_type = booking_type;

    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === "desc" ? -1 : 1;

    const bookings = await Booking.find(filter)
      .populate("item_id")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * limit)
      .sort(sortConfig)
      .lean();

    const total = await Booking.countDocuments(filter);

    const stats = await Booking.aggregate([
      { $match: { created_by: userId } },
      {
        $group: {
          _id: "$booking_status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusStats = stats.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit),
        },
        statistics: {
          total,
          ...statusStats,
        },
      },
    });
  } catch (error) {
    console.error("Get user bookings error:", error);
    res.status(500).json({ success: false, message: "Error fetching bookings" });
  }
};

/**
 * ============================================
 * GET BOOKING BY ID
 * ============================================
 */
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findOne({ _id: id, created_by: userId })
      .populate("item_id")
      .lean();

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    const payment = await Payment.findOne({ booking_id: id })
      .select("amount payment_method transaction_id payment_date gateway")
      .lean();

    return res.json({
      success: true,
      data: { ...booking, payment_details: payment },
    });
  } catch (error) {
    console.error("Get booking by ID error:", error);
    res.status(500).json({ success: false, message: "Error fetching booking" });
  }
};

/**
 * ============================================
 * CANCEL BOOKING
 * ============================================
 */
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const booking = await Booking.findOne({ _id: id, created_by: userId });

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    if (typeof booking.canBeCancelled === "function" && !booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled. Minimum 24 hours notice required.",
      });
    }

    if (booking.booking_status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking already cancelled",
      });
    }

    const refundAmount =
      typeof booking.calculateRefund === "function"
        ? booking.calculateRefund()
        : 0;

    booking.booking_status = "cancelled";
    booking.cancellation_reason = reason || "";
    booking.cancellation_date = new Date();
    booking.refund_amount = refundAmount;
    await booking.save();

    // Restore seats/tickets
    if (booking.booking_type === "movie") {
      await Movie.findByIdAndUpdate(booking.item_id, {
        $inc: { available_seats: booking.quantity },
      });
    }

    if (booking.booking_type === "bus") {
      await Bus.findByIdAndUpdate(booking.item_id, {
        $inc: { available_seats: booking.seats.length },
      });

      await Seat.updateMany(
        {
          item_type: "bus",
          item_id: booking.item_id,
          seat_number: { $in: booking.seats },
        },
        { $set: { status: "available", booked_by: null, booking_id: null } }
      );
    }

    if (booking.booking_type === "event") {
      await Event.findByIdAndUpdate(booking.item_id, {
        $inc: { available_tickets: booking.quantity },
      });
    }

    if (booking.booking_type === "tour") {
      await Tour.findByIdAndUpdate(booking.item_id, {
        $inc: { available_slots: booking.quantity },
      });
    }
    // ------------------------
    // UPDATE PAYMENT STATUS
    // ------------------------
    await Payment.findOneAndUpdate(
      { booking_id: booking._id },
      {
        status: refundAmount > 0 ? "refunded" : "cancelled",
        refund_amount: refundAmount,
        refund_date: new Date(),
      }
    );

    // ------------------------
    // REFUND TO WALLET
    // ------------------------
    if (refundAmount > 0) {
      const wallet = await Wallet.findOne({ user_id: userId });

      if (wallet) {
        await wallet.addFunds(refundAmount);

        const walletTransaction = new WalletTransaction({
          wallet_id: wallet._id,
          transaction_type: "refund",
          amount: refundAmount,
          description: `Refund for cancelled booking ${booking.booking_reference}`,
          booking_id: booking._id,
          balance_after: wallet.balance,
          status: "completed",
        });

        await walletTransaction.save();
      }
    }

    // ------------------------
    // USER NOTIFICATION
    // ------------------------
    try {
      await Notification.createNotification(userId, {
        title: "Booking Cancelled",
        message: `Your booking for ${booking.item_title} has been cancelled. ${
          refundAmount > 0
            ? `Refund of ₹${refundAmount} processed.`
            : "No refund applicable."
        }`,
        type: "cancellation",
        booking_id: booking._id,
        action_url: `/bookings/${booking._id}`,
        icon: "x-circle",
      });
    } catch (notifErr) {
      console.warn("Cancel notification failed:", notifErr);
    }

    const populatedBooking = await Booking.findById(booking._id).populate(
      "item_id"
    );

    return res.json({
      success: true,
      message: `Booking cancelled${
        refundAmount > 0 ? `. Refund of ₹${refundAmount} processed.` : ""
      }`,
      data: { booking: populatedBooking, refund_amount: refundAmount },
    });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error cancelling booking" });
  }
};

/**
 * ============================================
 * DOWNLOAD TICKET
 * ============================================
 */
export const downloadTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const booking = await Booking.findOne({
      _id: id,
      created_by: userId,
    }).populate("item_id");

    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    if (booking.booking_status !== "confirmed")
      return res.status(400).json({
        success: false,
        message: "Cannot download ticket for cancelled/unconfirmed booking",
      });

    const ticketData = {
      booking_reference: booking.booking_reference,
      item_title: booking.item_title,
      event_date: booking.event_date,
      event_time: booking.event_time,
      venue: booking.venue_details,
      seats: booking.seats,
      quantity: booking.quantity,
      total_amount: booking.total_amount,
      passenger_details: booking.passenger_details,
      qr_code_url: booking.qr_code_url,
      download_date: new Date().toLocaleDateString("en-IN"),
    };

    return res.json({
      success: true,
      data: ticketData,
      message: "Ticket generated",
    });
  } catch (error) {
    console.error("Download ticket error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error generating ticket" });
  }
};

/**
 * ============================================
 * BOOKING STATS
 * ============================================
 */
export const getBookingStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Booking.aggregate([
      { $match: { created_by: userId } },
      {
        $group: {
          _id: null,
          total_bookings: { $sum: 1 },
          total_spent: { $sum: "$total_amount" },
          confirmed_bookings: {
            $sum: { $cond: [{ $eq: ["$booking_status", "confirmed"] }, 1, 0] },
          },
          cancelled_bookings: {
            $sum: { $cond: [{ $eq: ["$booking_status", "cancelled"] }, 1, 0] },
          },
        },
      },
    ]);

    const typeStats = await Booking.aggregate([
      { $match: { created_by: userId } },
      {
        $group: {
          _id: "$booking_type",
          count: { $sum: 1 },
          total_amount: { $sum: "$total_amount" },
        },
      },
    ]);

    const monthlyStats = await Booking.aggregate([
      { $match: { created_by: userId } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          total_amount: { $sum: "$total_amount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]);

    return res.json({
      success: true,
      data: {
        overview:
          stats[0] || {
            total_bookings: 0,
            total_spent: 0,
            confirmed_bookings: 0,
            cancelled_bookings: 0,
          },
        by_type: typeStats,
        monthly: monthlyStats,
      },
    });
  } catch (error) {
    console.error("Get booking stats error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching booking statistics" });
  }
};

export default {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  downloadTicket,
  getBookingStats,
};

