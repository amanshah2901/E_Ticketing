import Train from '../models/Train.js';
import Booking from '../models/Booking.js';

// Get all trains
export const getTrains = async (req, res) => {
  try {
    const { 
      status = 'active', 
      limit = 10, 
      page = 1, 
      from_station,
      to_station,
      departure_date,
      train_type,
      search,
      sortBy = 'departure_date',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = { status };
    
    if (from_station) {
      filter.$or = [
        { from_station: new RegExp(from_station, 'i') },
        { from_station_code: new RegExp(from_station, 'i') }
      ];
    }
    
    if (to_station) {
      const toFilter = [
        { to_station: new RegExp(to_station, 'i') },
        { to_station_code: new RegExp(to_station, 'i') }
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
    
    if (train_type && train_type !== 'all') {
      filter.train_type = train_type;
    }
    
    if (search) {
      const searchFilter = {
        $or: [
          { train_number: new RegExp(search, 'i') },
          { train_name: new RegExp(search, 'i') },
          { operator: new RegExp(search, 'i') },
          { from_station: new RegExp(search, 'i') },
          { to_station: new RegExp(search, 'i') }
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

    const trains = await Train.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort(sortConfig)
      .select('-createdAt -updatedAt -__v');
    
    const total = await Train.countDocuments(filter);

    // Get unique values for filters
    const stations = await Train.distinct('from_station', { status: 'active' });
    const trainTypes = await Train.distinct('train_type', { status: 'active' });
    const operators = await Train.distinct('operator', { status: 'active' });

    res.json({
      success: true,
      data: {
        trains,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: {
          stations: stations.sort(),
          train_types: trainTypes,
          operators: operators.sort()
        }
      }
    });
  } catch (error) {
    console.error('Get trains error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trains'
    });
  }
};

// Get train by ID
export const getTrainById = async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);
    
    if (!train) {
      return res.status(404).json({
        success: false,
        message: 'Train not found'
      });
    }

    res.json({
      success: true,
      data: train
    });
  } catch (error) {
    console.error('Get train by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching train'
    });
  }
};

// Create train
export const createTrain = async (req, res) => {
  try {
    const train = new Train(req.body);
    await train.save();

    res.status(201).json({
      success: true,
      data: train,
      message: 'Train created successfully'
    });
  } catch (error) {
    console.error('Create train error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error creating train'
    });
  }
};

// Update train
export const updateTrain = async (req, res) => {
  try {
    const train = await Train.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!train) {
      return res.status(404).json({
        success: false,
        message: 'Train not found'
      });
    }

    res.json({
      success: true,
      data: train,
      message: 'Train updated successfully'
    });
  } catch (error) {
    console.error('Update train error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Error updating train'
    });
  }
};

// Delete train
export const deleteTrain = async (req, res) => {
  try {
    const train = await Train.findByIdAndDelete(req.params.id);

    if (!train) {
      return res.status(404).json({
        success: false,
        message: 'Train not found'
      });
    }

    res.json({
      success: true,
      message: 'Train deleted successfully'
    });
  } catch (error) {
    console.error('Delete train error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting train'
    });
  }
};

// Get popular train routes
export const getPopularRoutes = async (req, res) => {
  try {
    const trains = await Train.find({
      status: 'active',
      departure_date: { $gte: new Date() }
    })
      .sort({ departure_date: 1, departure_time: 1 })
      .limit(8)
      .select('train_number train_name operator from_station to_station from_station_code to_station_code departure_date departure_time arrival_time duration classes image_url ratings');

    res.json({
      success: true,
      data: {
        trains
      }
    });
  } catch (error) {
    console.error('Get popular train routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching popular train routes'
    });
  }
};

export const searchTrains = getTrains;

