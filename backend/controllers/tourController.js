import Tour from '../models/Tour.js';
import Booking from '../models/Booking.js';

// Get all tours
export const getTours = async (req, res) => {
  try {
    const { 
      status = 'available', 
      limit = 10, 
      page = 1, 
      destination, 
      tour_type, 
      difficulty_level,
      search,
      featured,
      sortBy = 'start_date',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = { status };
    
    if (destination && destination !== 'all') {
      filter.destination = new RegExp(destination, 'i');
    }
    
    if (tour_type && tour_type !== 'all') {
      filter.tour_type = tour_type;
    }
    
    if (difficulty_level && difficulty_level !== 'all') {
      filter.difficulty_level = difficulty_level;
    }
    
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { destination: new RegExp(search, 'i') },
        { tour_operator: new RegExp(search, 'i') }
      ];
    }
    
    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }

    // Only show tours with future start dates
    filter.start_date = { $gte: new Date() };

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const tours = await Tour.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sortConfig)
      .select('-createdAt -updatedAt -__v');
    
    const total = await Tour.countDocuments(filter);

    // Get unique values for filters
    const destinations = await Tour.distinct('destination', { status: 'available', start_date: { $gte: new Date() } });
    const tourTypes = await Tour.distinct('tour_type', { status: 'available', start_date: { $gte: new Date() } });
    const difficultyLevels = await Tour.distinct('difficulty_level', { status: 'available', start_date: { $gte: new Date() } });
    const operators = await Tour.distinct('tour_operator', { status: 'available', start_date: { $gte: new Date() } });

    res.json({
      success: true,
      data: {
        tours,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: {
          destinations: destinations.sort(),
          tour_types: tourTypes,
          difficulty_levels: difficultyLevels,
          operators: operators.sort()
        }
      }
    });
  } catch (error) {
    console.error('Get tours error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tours'
    });
  }
};

// Get featured tours
export const getFeaturedTours = async (req, res) => {
  try {
    const tours = await Tour.find({ 
      status: 'available',
      featured: true,
      start_date: { $gte: new Date() }
    })
    .sort({ start_date: 1 })
    .limit(6)
    .select('title image_url destination duration start_date price_per_person tour_operator available_slots');

    res.json({
      success: true,
      data: tours
    });
  } catch (error) {
    console.error('Get featured tours error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured tours'
    });
  }
};

// Get tour by ID
export const getTourById = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    // Get similar tours (same destination or tour type)
    const similarTours = await Tour.find({
      _id: { $ne: tour._id },
      $or: [
        { destination: tour.destination },
        { tour_type: tour.tour_type }
      ],
      status: 'available',
      start_date: { $gte: new Date() }
    })
    .limit(4)
    .select('title image_url destination duration start_date price_per_person tour_operator');

    res.json({
      success: true,
      data: {
        ...tour.toObject(),
        similar_tours: similarTours
      }
    });
  } catch (error) {
    console.error('Get tour by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid tour ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching tour'
    });
  }
};

// Create tour (Admin only)
export const createTour = async (req, res) => {
  try {
    const tourData = req.body;

    // Validate start date is in future
    const startDate = new Date(tourData.start_date);
    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be in the future'
      });
    }

    // Validate end date is after start date
    const endDate = new Date(tourData.end_date);
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const tour = new Tour(tourData);
    await tour.save();

    res.status(201).json({
      success: true,
      message: 'Tour created successfully',
      data: tour
    });
  } catch (error) {
    console.error('Create tour error:', error);
    
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
      message: 'Error creating tour'
    });
  }
};

// Update tour (Admin only)
export const updateTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    // Prevent updating if there are existing bookings
    const existingBookings = await Booking.countDocuments({
      item_id: tour._id,
      booking_type: 'tour',
      booking_status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBookings > 0 && req.body.max_capacity && req.body.max_capacity < tour.max_capacity) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reduce max capacity as there are existing bookings'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        tour[key] = req.body[key];
      }
    });

    await tour.save();

    res.json({
      success: true,
      message: 'Tour updated successfully',
      data: tour
    });
  } catch (error) {
    console.error('Update tour error:', error);
    
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
      message: 'Error updating tour'
    });
  }
};

// Delete tour (Admin only)
export const deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.id);
    
    if (!tour) {
      return res.status(404).json({
        success: false,
        message: 'Tour not found'
      });
    }

    // Check for existing bookings
    const existingBookings = await Booking.countDocuments({
      item_id: tour._id,
      booking_type: 'tour'
    });

    if (existingBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete tour with existing bookings'
      });
    }

    await Tour.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Tour deleted successfully'
    });
  } catch (error) {
    console.error('Delete tour error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting tour'
    });
  }
};

// Get tours by destination
export const getToursByDestination = async (req, res) => {
  try {
    const { destination } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const tours = await Tour.find({
      destination: new RegExp(destination, 'i'),
      status: 'available',
      start_date: { $gte: new Date() }
    })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort({ start_date: 1 })
    .select('title image_url destination duration start_date price_per_person tour_operator available_slots');

    const total = await Tour.countDocuments({
      destination: new RegExp(destination, 'i'),
      status: 'available',
      start_date: { $gte: new Date() }
    });

    res.json({
      success: true,
      data: {
        tours,
        destination,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get tours by destination error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tours by destination'
    });
  }
};

// Search tours
export const searchTours = async (req, res) => {
  try {
    const { destination, tour_type, difficulty_level, min_price, max_price, duration } = req.query;

    const filter = {
      status: 'available',
      start_date: { $gte: new Date() }
    };

    if (destination) {
      filter.destination = new RegExp(destination, 'i');
    }

    if (tour_type && tour_type !== 'all') {
      filter.tour_type = tour_type;
    }

    if (difficulty_level && difficulty_level !== 'all') {
      filter.difficulty_level = difficulty_level;
    }

    if (min_price || max_price) {
      filter.price_per_person = {};
      if (min_price) filter.price_per_person.$gte = parseFloat(min_price);
      if (max_price) filter.price_per_person.$lte = parseFloat(max_price);
    }

    if (duration) {
      // Handle duration ranges like "3-5 days", "1 week", etc.
      if (duration.includes('-')) {
        const [minDays, maxDays] = duration.split('-').map(d => parseInt(d));
        filter.duration = new RegExp(`${minDays}.*${maxDays}|${maxDays}.*${minDays}`, 'i');
      } else {
        filter.duration = new RegExp(duration, 'i');
      }
    }

    const tours = await Tour.find(filter)
      .sort({ price_per_person: 1, start_date: 1 })
      .select('title image_url destination duration start_date price_per_person tour_operator available_slots tour_type difficulty_level');

    res.json({
      success: true,
      data: tours
    });
  } catch (error) {
    console.error('Search tours error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching tours'
    });
  }
};