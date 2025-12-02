import Bus from '../models/Bus.js';
import Booking from '../models/Booking.js';
import Seat from '../models/Seat.js';

// Get all buses
export const getBuses = async (req, res) => {
  try {
    const { 
      status = 'active', 
      limit = 10, 
      page = 1, 
      from_city, 
      to_city, 
      departure_date,
      bus_type,
      search,
      sortBy = 'departure_date',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = { status };
    
    if (from_city) {
      filter.from_city = new RegExp(from_city, 'i');
    }
    
    if (to_city) {
      filter.to_city = new RegExp(to_city, 'i');
    }
    
    if (departure_date) {
      const startDate = new Date(departure_date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(departure_date);
      endDate.setHours(23, 59, 59, 999);
      
      filter.departure_date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    if (bus_type && bus_type !== 'all') {
      filter.bus_type = bus_type;
    }
    
    if (search) {
      filter.$or = [
        { operator: new RegExp(search, 'i') },
        { bus_number: new RegExp(search, 'i') },
        { from_city: new RegExp(search, 'i') },
        { to_city: new RegExp(search, 'i') }
      ];
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const buses = await Bus.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sortConfig)
      .select('-createdAt -updatedAt -__v');
    
    const total = await Bus.countDocuments(filter);

    // Get unique values for filters
    const cities = await Bus.distinct('from_city', { status: 'active' });
    const busTypes = await Bus.distinct('bus_type', { status: 'active' });
    const operators = await Bus.distinct('operator', { status: 'active' });

    res.json({
      success: true,
      data: {
        buses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: {
          cities: cities.sort(),
          bus_types: busTypes,
          operators: operators.sort()
        }
      }
    });
  } catch (error) {
    console.error('Get buses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching buses'
    });
  }
};

// Get popular bus routes
export const getPopularRoutes = async (req, res) => {
  try {
    const popularRoutes = await Bus.aggregate([
      { 
        $match: { 
          status: 'active',
          departure_date: { $gte: new Date() }
        } 
      },
      {
        $group: {
          _id: {
            from_city: '$from_city',
            to_city: '$to_city'
          },
          route_count: { $sum: 1 },
          min_price: { $min: '$price' },
          operators: { $addToSet: '$operator' }
        }
      },
      { $match: { route_count: { $gte: 3 } } },
      { $sort: { route_count: -1 } },
      { $limit: 8 }
    ]);

    const routes = popularRoutes.map(route => ({
      from_city: route._id.from_city,
      to_city: route._id.to_city,
      route_count: route.route_count,
      min_price: route.min_price,
      operators: route.operators
    }));

    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    console.error('Get popular routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular routes'
    });
  }
};

// Get bus by ID
export const getBusById = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Get available seats for this bus
    const availableSeats = await Seat.countDocuments({
      item_type: 'bus',
      item_id: bus._id,
      status: 'available'
    });

    // Get similar buses (same route)
    const similarBuses = await Bus.find({
      _id: { $ne: bus._id },
      from_city: bus.from_city,
      to_city: bus.to_city,
      status: 'active',
      departure_date: { $gte: new Date() }
    })
    .limit(4)
    .select('operator bus_type departure_date departure_time arrival_time duration price available_seats');

    res.json({
      success: true,
      data: {
        ...bus.toObject(),
        available_seats_count: availableSeats,
        similar_buses: similarBuses
      }
    });
  } catch (error) {
    console.error('Get bus by ID error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid bus ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching bus'
    });
  }
};

// Create bus (Admin only)
export const createBus = async (req, res) => {
  try {
    const busData = req.body;

    // Validate departure date is in future
    const departureDate = new Date(busData.departure_date);
    if (departureDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Departure date must be in the future'
      });
    }

    const bus = new Bus(busData);
    await bus.save();

    // Generate seats for the bus
    await generateBusSeats(bus._id, bus.total_seats, bus.price, bus.bus_type);

    res.status(201).json({
      success: true,
      message: 'Bus created successfully',
      data: bus
    });
  } catch (error) {
    console.error('Create bus error:', error);
    
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
      message: 'Error creating bus'
    });
  }
};

// Update bus (Admin only)
export const updateBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Prevent updating if there are existing bookings
    const existingBookings = await Booking.countDocuments({
      item_id: bus._id,
      booking_type: 'bus',
      booking_status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBookings > 0 && req.body.total_seats && req.body.total_seats < bus.total_seats) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reduce total seats as there are existing bookings'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        bus[key] = req.body[key];
      }
    });

    await bus.save();

    res.json({
      success: true,
      message: 'Bus updated successfully',
      data: bus
    });
  } catch (error) {
    console.error('Update bus error:', error);
    
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
      message: 'Error updating bus'
    });
  }
};

// Delete bus (Admin only)
export const deleteBus = async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    // Check for existing bookings
    const existingBookings = await Booking.countDocuments({
      item_id: bus._id,
      booking_type: 'bus'
    });

    if (existingBookings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bus with existing bookings'
      });
    }

    // Delete associated seats
    await Seat.deleteMany({
      item_type: 'bus',
      item_id: bus._id
    });

    await Bus.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Bus deleted successfully'
    });
  } catch (error) {
    console.error('Delete bus error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting bus'
    });
  }
};

// Generate seats for a bus
const generateBusSeats = async (busId, totalSeats, basePrice, busType) => {
  try {
    const seats = [];
    const isSleeper = busType.includes('sleeper');
    const rows = isSleeper ? Math.ceil(totalSeats / 2) : Math.ceil(totalSeats / 4);
    
    for (let row = 1; row <= rows; row++) {
      const rowLetter = String.fromCharCode(64 + row); // A, B, C, ...
      const seatsInRow = isSleeper ? 2 : 4;
      
      for (let col = 1; col <= seatsInRow; col++) {
        const seatNumber = (row - 1) * seatsInRow + col;
        if (seatNumber > totalSeats) break;

        // Determine seat type
        let seatType = 'regular';
        if (isSleeper) {
          seatType = 'sleeper';
        } else {
          seatType = col === 1 || col === 4 ? 'window' : 'aisle';
        }

        seats.push({
          item_type: 'bus',
          item_id: busId,
          seat_number: seatNumber.toString(),
          row: rowLetter,
          column: col,
          seat_type: seatType,
          price: basePrice,
          status: 'available'
        });
      }
    }

    await Seat.insertMany(seats);
    console.log(`Generated ${seats.length} seats for bus ${busId}`);
  } catch (error) {
    console.error('Generate bus seats error:', error);
    throw error;
  }
};

// Get bus seats
export const getBusSeats = async (req, res) => {
  try {
    const { busId } = req.params;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    const seats = await Seat.find({
      item_type: 'bus',
      item_id: busId
    }).sort({ row: 1, column: 1 });

    // Group seats by row for frontend display
    const groupedSeats = seats.reduce((acc, seat) => {
      if (!acc[seat.row]) {
        acc[seat.row] = [];
      }
      acc[seat.row].push(seat);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        bus: {
          id: bus._id,
          operator: bus.operator,
          bus_type: bus.bus_type,
          from_city: bus.from_city,
          to_city: bus.to_city,
          departure_date: bus.departure_date,
          departure_time: bus.departure_time,
          total_seats: bus.total_seats,
          available_seats: bus.available_seats,
          is_sleeper: bus.bus_type.includes('sleeper')
        },
        seats: groupedSeats,
        seat_layout: {
          rows: Object.keys(groupedSeats).sort(),
          seats_per_row: Math.max(...Object.values(groupedSeats).map(row => row.length)),
          is_sleeper: bus.bus_type.includes('sleeper')
        }
      }
    });
  } catch (error) {
    console.error('Get bus seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bus seats'
    });
  }
};

// Search buses by route and date
export const searchBuses = async (req, res) => {
  try {
    const { from_city, to_city, departure_date, passengers = 1 } = req.query;

    if (!from_city || !to_city || !departure_date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide from city, to city, and departure date'
      });
    }

    const startDate = new Date(departure_date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(departure_date);
    endDate.setHours(23, 59, 59, 999);

    const buses = await Bus.find({
      from_city: new RegExp(from_city, 'i'),
      to_city: new RegExp(to_city, 'i'),
      departure_date: {
        $gte: startDate,
        $lte: endDate
      },
      status: 'active',
      available_seats: { $gte: parseInt(passengers) }
    })
    .sort({ departure_time: 1, price: 1 })
    .select('-createdAt -updatedAt -__v');

    res.json({
      success: true,
      data: {
        buses,
        search_params: {
          from_city,
          to_city,
          departure_date,
          passengers: parseInt(passengers)
        }
      }
    });
  } catch (error) {
    console.error('Search buses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching buses'
    });
  }
};