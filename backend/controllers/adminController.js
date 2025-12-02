import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Movie from '../models/Movie.js';
import Bus from '../models/Bus.js';
import Event from '../models/Event.js';
import Tour from '../models/Tour.js';
import Wallet from '../models/Wallet.js';
import Notification from '../models/Notification.js';

// Get admin dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Total statistics
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalMovies = await Movie.countDocuments();
    const totalBuses = await Bus.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalTours = await Tour.countDocuments();

    // Revenue statistics
    const revenueStats = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: '$amount' },
          today_revenue: {
            $sum: {
              $cond: [
                { $eq: [{ $dateToString: { format: '%Y-%m-%d', date: '$payment_date' } }, { $dateToString: { format: '%Y-%m-%d', date: new Date() } }] },
                '$amount',
                0
              ]
            }
          },
          monthly_revenue: {
            $sum: {
              $cond: [
                { $eq: [{ $month: '$payment_date' }, { $month: new Date() }] },
                '$amount',
                0
              ]
            }
          }
        }
      }
    ]);

    // Booking statistics
    const bookingStats = await Booking.aggregate([
      {
        $group: {
          _id: '$booking_status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly revenue trend
    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: {
            year: { $year: '$payment_date' },
            month: { $month: '$payment_date' }
          },
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Popular booking types
    const popularTypes = await Booking.aggregate([
      {
        $group: {
          _id: '$booking_type',
          count: { $sum: 1 },
          revenue: { $sum: '$total_amount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Recent activities
    const recentBookings = await Booking.find()
      .populate('created_by', 'full_name email')
      .populate('item_id')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const recentPayments = await Payment.find()
      .populate('booking_id')
      .sort({ payment_date: -1 })
      .limit(10)
      .lean();

    const stats = {
      overview: {
        total_users: totalUsers,
        total_bookings: totalBookings,
        total_movies: totalMovies,
        total_buses: totalBuses,
        total_events: totalEvents,
        total_tours: totalTours,
        ...(revenueStats[0] || {
          total_revenue: 0,
          today_revenue: 0,
          monthly_revenue: 0
        })
      },
      bookings: bookingStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      monthly_revenue: monthlyRevenue,
      popular_types: popularTypes,
      recent_activities: {
        bookings: recentBookings,
        payments: recentPayments
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const { limit = 20, page = 1, search, role, is_active } = req.query;

    const filter = {};
    
    if (search) {
      filter.$or = [
        { full_name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    
    if (role && role !== 'all') {
      filter.role = role;
    }
    
    if (is_active !== undefined) {
      filter.is_active = is_active === 'true';
    }

    const users = await User.find(filter)
      .select('-password')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(filter);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        statistics: userStats
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// Get user details (Admin only)
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's wallet
    const wallet = await Wallet.findOne({ user_id: userId });

    // Get user's bookings
    const userBookings = await Booking.find({ created_by: userId })
      .populate('item_id')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get user's booking statistics
    const bookingStats = await Booking.aggregate([
      { $match: { created_by: userId } },
      {
        $group: {
          _id: '$booking_status',
          count: { $sum: 1 },
          total_amount: { $sum: '$total_amount' }
        }
      }
    ]);

    // Get total spent
    const totalSpent = await Payment.aggregate([
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking_id',
          foreignField: '_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      { $match: { 'booking.created_by': userId, status: 'success' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        user,
        wallet: wallet || { balance: 0 },
        recent_bookings: userBookings,
        statistics: {
          total_bookings: bookingStats.reduce((sum, stat) => sum + stat.count, 0),
          total_spent: totalSpent[0]?.total || 0,
          by_status: bookingStats
        }
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    });
  }
};

// Update user (Admin only)
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, is_active, full_name, phone } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from modifying their own role
    if (userId === req.user._id.toString() && role && role !== user.role) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify your own role'
      });
    }

    if (role) user.role = role;
    if (is_active !== undefined) user.is_active = is_active;
    if (full_name) user.full_name = full_name;
    if (phone) user.phone = phone;

    await user.save();

    // Create notification for user if their status changed
    if (is_active !== undefined && is_active !== user.is_active) {
      await Notification.createNotification(userId, {
        title: is_active ? 'Account Reactivated' : 'Account Deactivated',
        message: is_active 
          ? 'Your account has been reactivated by administrator.' 
          : 'Your account has been deactivated by administrator.',
        type: 'system',
        icon: is_active ? 'check-circle' : 'x-circle',
        is_important: true
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

// Get all bookings (Admin only)
export const getAllBookings = async (req, res) => {
  try {
    const { 
      limit = 20, 
      page = 1, 
      status, 
      booking_type, 
      start_date, 
      end_date,
      search 
    } = req.query;

    const filter = {};
    
    if (status && status !== 'all') {
      filter.booking_status = status;
    }
    
    if (booking_type && booking_type !== 'all') {
      filter.booking_type = booking_type;
    }
    
    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) {
        const start = new Date(start_date);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }
    
    if (search) {
      filter.$or = [
        { booking_reference: new RegExp(search, 'i') },
        { item_title: new RegExp(search, 'i') }
      ];
    }

    const bookings = await Booking.find(filter)
      .populate('created_by', 'full_name email phone')
      .populate('item_id')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await Booking.countDocuments(filter);

    // Get booking statistics for the filter
    const stats = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$booking_status',
          count: { $sum: 1 },
          revenue: { $sum: '$total_amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        statistics: stats
      }
    });
  } catch (error) {
    console.error('Get all bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
};

// Update booking (Admin only)
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { booking_status, cancellation_reason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking_status) booking.booking_status = booking_status;
    if (cancellation_reason) booking.cancellation_reason = cancellation_reason;

    if (booking_status === 'cancelled') {
      booking.cancellation_date = new Date();
    }

    await booking.save();

    // Create notification for user
    await Notification.createNotification(booking.created_by, {
      title: `Booking ${booking_status}`,
      message: `Your booking ${booking.booking_reference} has been ${booking_status} by administrator.`,
      type: 'booking',
      booking_id: booking._id,
      action_url: `/bookings/${booking._id}`,
      icon: booking_status === 'confirmed' ? 'check-circle' : 'x-circle',
      is_important: true
    });

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking'
    });
  }
};

// Get revenue analytics
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;

    let groupBy;
    let match = { status: 'success' };

    if (period === 'daily') {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      match.payment_date = { $gte: startDate, $lte: endDate };
      
      groupBy = {
        _id: {
          year: { $year: '$payment_date' },
          month: { $month: '$payment_date' },
          day: { $dayOfMonth: '$payment_date' }
        }
      };
    } else if (period === 'monthly') {
      match.payment_date = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31T23:59:59.999Z`)
      };
      
      groupBy = {
        _id: {
          year: { $year: '$payment_date' },
          month: { $month: '$payment_date' }
        }
      };
    } else if (period === 'yearly') {
      groupBy = {
        _id: { year: { $year: '$payment_date' } }
      };
    }

    const revenueData = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          ...groupBy,
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 },
          average_ticket: { $avg: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Revenue by booking type
    const revenueByType = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking_id',
          foreignField: '_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $group: {
          _id: '$booking.booking_type',
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      }
    ]);

    // Payment method distribution
    const paymentMethodStats = await Payment.aggregate([
      { $match: { status: 'success' } },
      {
        $group: {
          _id: '$payment_method',
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        timeline: revenueData,
        by_type: revenueByType,
        by_payment_method: paymentMethodStats,
        period,
        year: parseInt(year)
      }
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue analytics'
    });
  }
};