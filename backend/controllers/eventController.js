import Event from '../models/Event.js';
import Booking from '../models/Booking.js';

// Get all events
export const getEvents = async (req, res) => {
  try {
    const { 
      status = 'upcoming', 
      limit = 10, 
      page = 1, 
      category, 
      city, 
      search,
      featured,
      sortBy = 'event_date',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = { status };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (city && city !== 'all') {
      filter.city = new RegExp(city, 'i');
    }
    
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { venue: new RegExp(search, 'i') },
        { organizer: new RegExp(search, 'i') }
      ];
    }
    
    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const events = await Event.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sortConfig)
      .select('-createdAt -updatedAt -__v');
    
    const total = await Event.countDocuments(filter);

    // Get unique values for filters
    const categories = await Event.distinct('category', { status: 'upcoming' });
    const cities = await Event.distinct('city', { status: 'upcoming' });
    const organizers = await Event.distinct('organizer', { status: 'upcoming' });

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: {
          categories: categories.sort(),
          cities: cities.sort(),
          organizers: organizers.sort()
        }
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events'
    });
  }
};

// Get featured events
export const getFeaturedEvents = async (req, res) => {
  try {
    const events = await Event.find({ 
      status: 'upcoming',
      featured: true 
    })
    .sort({ event_date: 1 })
    .limit(6)
    .select('title image_url event_date event_time venue city price organizer');

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Get featured events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured events'
    });
  }
};

// Get event by ID
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get similar events (same category or city)
    const similarEvents = await Event.find({
      _id: { $ne: event._id },
      $or: [
        { category: event.category },
        { city: event.city }
      ],
      status: 'upcoming',
      event_date: { $gte: new Date() }
    })
    .limit(4)
    .select('title image_url event_date event_time venue city price');

    res.json({
      success: true,
      data: {
        ...event.toObject(),
        similar_events: similarEvents
      }
    });
  } catch (error) {
    console.error('Get event by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching event'
    });
  }
};

// Create event (Admin only)
export const createEvent = async (req, res) => {
  try {
    const eventData = req.body;

    // Validate event date is in future
    const eventDate = new Date(eventData.event_date);
    if (eventDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Event date must be in the future'
      });
    }

    const event = new Event(eventData);
    await event.save();

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    
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
      message: 'Error creating event'
    });
  }
};

// Update event (Admin only)
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Prevent updating if there are existing bookings
    const existingBookings = await Booking.countDocuments({
      item_id: event._id,
      booking_type: 'event',
      booking_status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBookings > 0 && req.body.total_tickets && req.body.total_tickets < event.total_tickets) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reduce total tickets as there are existing bookings'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        event[key] = req.body[key];
      }
    });

    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  } catch (error) {
    console.error('Update event error:', error);
    
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
      message: 'Error updating event'
    });
  }
};

// Delete event (Admin only)
export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check for existing bookings
    const existingBookings = await Booking.countDocuments({
      item_id: event._id,
      booking_type: 'event'
    });

    if (existingBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete event with existing bookings'
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting event'
    });
  }
};

// Get events by category
export const getEventsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const events = await Event.find({
      category: category,
      status: 'upcoming',
      event_date: { $gte: new Date() }
    })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .sort({ event_date: 1 })
    .select('title image_url event_date event_time venue city price organizer');

    const total = await Event.countDocuments({
      category: category,
      status: 'upcoming',
      event_date: { $gte: new Date() }
    });

    res.json({
      success: true,
      data: {
        events,
        category,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get events by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events by category'
    });
  }
};

// Search events
export const searchEvents = async (req, res) => {
  try {
    const { query, city, category, date } = req.query;

    const filter = {
      status: 'upcoming',
      event_date: { $gte: new Date() }
    };

    if (query) {
      filter.$or = [
        { title: new RegExp(query, 'i') },
        { description: new RegExp(query, 'i') },
        { venue: new RegExp(query, 'i') },
        { organizer: new RegExp(query, 'i') }
      ];
    }

    if (city && city !== 'all') {
      filter.city = new RegExp(city, 'i');
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      filter.event_date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const events = await Event.find(filter)
      .sort({ event_date: 1 })
      .select('title image_url event_date event_time venue city price organizer category');

    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    console.error('Search events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching events'
    });
  }
};