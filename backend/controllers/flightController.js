import Flight from '../models/Flight.js';
import Booking from '../models/Booking.js';

// Get all flights
export const getFlights = async (req, res) => {
  try {
    const { 
      status = 'active', 
      limit = 10, 
      page = 1, 
      from_airport,
      to_airport,
      departure_date,
      airline,
      search,
      sortBy = 'departure_date',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = { status };
    
    if (from_airport) {
      filter.$or = [
        { from_airport: new RegExp(from_airport, 'i') },
        { from_airport_code: new RegExp(from_airport, 'i') }
      ];
    }
    
    if (to_airport) {
      const toFilter = [
        { to_airport: new RegExp(to_airport, 'i') },
        { to_airport_code: new RegExp(to_airport, 'i') }
      ];
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: toFilter }
        ];
        delete filter.$or;
      } else {
        filter.$or = toFilter;
      }
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
    
    if (airline && airline !== 'all') {
      filter.airline = new RegExp(airline, 'i');
    }
    
    if (search) {
      const searchFilter = {
        $or: [
          { flight_number: new RegExp(search, 'i') },
          { airline: new RegExp(search, 'i') },
          { from_airport: new RegExp(search, 'i') },
          { to_airport: new RegExp(search, 'i') }
        ]
      };
      
      if (filter.$and) {
        filter.$and.push(searchFilter);
      } else if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          searchFilter
        ];
        delete filter.$or;
      } else {
        Object.assign(filter, searchFilter);
      }
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const flights = await Flight.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sortConfig)
      .select('-createdAt -updatedAt -__v');
    
    const total = await Flight.countDocuments(filter);

    // Get unique values for filters
    const airports = await Flight.distinct('from_airport', { status: 'active' });
    const airlines = await Flight.distinct('airline', { status: 'active' });

    res.json({
      success: true,
      data: {
        flights,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: {
          airports: airports.sort(),
          airlines: airlines.sort()
        }
      }
    });
  } catch (error) {
    console.error('Get flights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flights'
    });
  }
};

// Get flight by ID
export const getFlightById = async (req, res) => {
  try {
    const flight = await Flight.findById(req.params.id);
    
    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    res.json({
      success: true,
      data: flight
    });
  } catch (error) {
    console.error('Get flight by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching flight'
    });
  }
};

// Create flight
export const createFlight = async (req, res) => {
  try {
    const flight = new Flight(req.body);
    await flight.save();

    res.status(201).json({
      success: true,
      data: flight,
      message: 'Flight created successfully'
    });
  } catch (error) {
    console.error('Create flight error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating flight'
    });
  }
};

// Update flight
export const updateFlight = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    res.json({
      success: true,
      data: flight,
      message: 'Flight updated successfully'
    });
  } catch (error) {
    console.error('Update flight error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating flight'
    });
  }
};

// Delete flight
export const deleteFlight = async (req, res) => {
  try {
    const flight = await Flight.findByIdAndDelete(req.params.id);

    if (!flight) {
      return res.status(404).json({
        success: false,
        message: 'Flight not found'
      });
    }

    res.json({
      success: true,
      message: 'Flight deleted successfully'
    });
  } catch (error) {
    console.error('Delete flight error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting flight'
    });
  }
};

// Get popular flight routes
export const getPopularRoutes = async (req, res) => {
  try {
    const flights = await Flight.find({
      status: 'active',
      departure_date: { $gte: new Date() }
    })
      .sort({ departure_date: 1, departure_time: 1 })
      .limit(8)
      .select('flight_number airline from_airport to_airport from_airport_code to_airport_code departure_date departure_time arrival_time duration classes stops image_url ratings');

    res.json({
      success: true,
      data: {
        flights
      }
    });
  } catch (error) {
    console.error('Get popular flight routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular flight routes'
    });
  }
};

export const searchFlights = getFlights;

