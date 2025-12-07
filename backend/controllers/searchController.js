// backend/controllers/searchController.js
import Movie from '../models/Movie.js';
import Bus from '../models/Bus.js';
import Train from '../models/Train.js';
import Flight from '../models/Flight.js';
import Event from '../models/Event.js';
import Tour from '../models/Tour.js';

/**
 * Unified search across Movies, Buses, Events, and Tours
 * GET /api/search?query=xyz
 */
export const unifiedSearch = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === '') {
      return res.json({
        success: true,
        data: {
          movies: [],
          buses: [],
          events: [],
          tours: []
        },
        message: 'Please provide a search query'
      });
    }

    const searchTerm = query.trim();
    const searchRegex = new RegExp(searchTerm, 'i');

    // Search in parallel for better performance
    const [movies, buses, trains, flights, events, tours] = await Promise.all([
      // Search Movies
      Movie.find({
        $or: [
          { title: searchRegex },
          { genre: searchRegex },
          { description: searchRegex },
          { language: searchRegex },
          { director: searchRegex },
          { cast: { $in: [searchRegex] } }
        ],
        status: 'active'
      })
        .select('title poster_url genre duration language rating price show_date show_time theater featured imdb_rating')
        .limit(20)
        .sort({ featured: -1, createdAt: -1 }),

      // Search Buses
      Bus.find({
        $or: [
          { operator: searchRegex },
          { from_city: searchRegex },
          { to_city: searchRegex },
          { route: searchRegex },
          { bus_number: searchRegex }
        ],
        status: 'active'
      })
        .select('operator bus_number from_city to_city route departure_date departure_time arrival_time price available_seats bus_type amenities ratings image_url')
        .limit(20)
        .sort({ departure_date: 1, price: 1 }),

      // Search Trains
      Train.find({
        $or: [
          { train_number: searchRegex },
          { train_name: searchRegex },
          { operator: searchRegex },
          { from_station: searchRegex },
          { to_station: searchRegex }
        ],
        status: 'active'
      })
        .select('train_number train_name operator from_station to_station from_station_code to_station_code departure_date departure_time arrival_time duration classes ratings image_url')
        .limit(20)
        .sort({ departure_date: 1 }),

      // Search Flights
      Flight.find({
        $or: [
          { flight_number: searchRegex },
          { airline: searchRegex },
          { from_airport: searchRegex },
          { to_airport: searchRegex }
        ],
        status: 'active'
      })
        .select('flight_number airline from_airport to_airport from_airport_code to_airport_code departure_date departure_time arrival_time duration classes stops ratings image_url')
        .limit(20)
        .sort({ departure_date: 1 }),

      // Search Events
      Event.find({
        $or: [
          { title: searchRegex },
          { category: searchRegex },
          { description: searchRegex },
          { venue: searchRegex },
          { city: searchRegex },
          { organizer: searchRegex },
          { tags: { $in: [searchRegex] } }
        ],
        status: 'upcoming',
        event_date: { $gte: new Date() }
      })
        .select('title image_url category venue city event_date event_time price available_tickets organizer tags featured')
        .limit(20)
        .sort({ event_date: 1 }),

      // Search Tours
      Tour.find({
        $or: [
          { title: searchRegex },
          { destination: searchRegex },
          { description: searchRegex },
          { tour_operator: searchRegex },
          { tour_type: searchRegex }
        ],
        status: 'available',
        start_date: { $gte: new Date() }
      })
        .select('title image_url destination duration start_date price_per_person available_slots tour_operator tour_type difficulty_level featured')
        .limit(20)
        .sort({ start_date: 1, price_per_person: 1 })
    ]);

    res.json({
      success: true,
      data: {
        movies,
        buses,
        trains,
        flights,
        events,
        tours
      },
      query: searchTerm,
      counts: {
        movies: movies.length,
        buses: buses.length,
        trains: trains.length,
        flights: flights.length,
        events: events.length,
        tours: tours.length,
        total: movies.length + buses.length + trains.length + flights.length + events.length + tours.length
      }
    });
  } catch (error) {
    console.error('Unified search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Search buses, trains, and flights by source, destination, and date
 * GET /api/search/transport?from=...&to=...&date=...&type=bus|train|flight
 */
export const searchTransport = async (req, res) => {
  try {
    const { from, to, date, type = 'all' } = req.query;

    console.log('Search transport request:', { from, to, date, type });

    if (!from || !to || !date) {
      return res.status(400).json({
        success: false,
        message: 'from, to, and date are required'
      });
    }

    // Handle different date formats (YYYY-MM-DD, DD-MM-YYYY, etc.)
    let searchDate;
    if (date.includes('-')) {
      const parts = date.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        searchDate = new Date(date);
      } else {
        // DD-MM-YYYY format
        searchDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    } else {
      searchDate = new Date(date);
    }

    if (isNaN(searchDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    const startDate = new Date(searchDate);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(searchDate);
    endDate.setHours(23, 59, 59, 999);

    console.log('Search date range:', { startDate, endDate });

    const results = {
      buses: [],
      trains: [],
      flights: []
    };

    // Search buses
    if (type === 'all' || type === 'bus') {
      const busQuery = {
        from_city: new RegExp(from.trim(), 'i'),
        to_city: new RegExp(to.trim(), 'i'),
        departure_date: {
          $gte: startDate,
          $lte: endDate
        },
        status: 'active'
      };
      
      console.log('Bus search query:', JSON.stringify(busQuery, null, 2));
      
      const buses = await Bus.find(busQuery)
        .select('operator bus_number from_city to_city departure_date departure_time arrival_time duration price available_seats bus_type amenities ratings image_url')
        .sort({ departure_time: 1, price: 1 })
        .limit(50);
      
      console.log(`Found ${buses.length} buses`);
      results.buses = buses;
    }

    // Search trains
    if (type === 'all' || type === 'train') {
      const trainQuery = {
        $or: [
          { from_station: new RegExp(from.trim(), 'i') },
          { from_station_code: new RegExp(from.trim(), 'i') }
        ],
        $and: [
          {
            $or: [
              { to_station: new RegExp(to.trim(), 'i') },
              { to_station_code: new RegExp(to.trim(), 'i') }
            ]
          }
        ],
        departure_date: {
          $gte: startDate,
          $lte: endDate
        },
        status: 'active'
      };
      
      console.log('Train search query:', JSON.stringify(trainQuery, null, 2));
      
      const trains = await Train.find(trainQuery)
        .select('train_number train_name operator from_station to_station from_station_code to_station_code departure_date departure_time arrival_time duration classes ratings image_url')
        .sort({ departure_time: 1 })
        .limit(50);
      
      console.log(`Found ${trains.length} trains`);
      results.trains = trains;
    }

    // Search flights
    if (type === 'all' || type === 'flight') {
      const flightQuery = {
        $or: [
          { from_airport: new RegExp(from.trim(), 'i') },
          { from_airport_code: new RegExp(from.trim(), 'i') }
        ],
        $and: [
          {
            $or: [
              { to_airport: new RegExp(to.trim(), 'i') },
              { to_airport_code: new RegExp(to.trim(), 'i') }
            ]
          }
        ],
        departure_date: {
          $gte: startDate,
          $lte: endDate
        },
        status: 'active'
      };
      
      console.log('Flight search query:', JSON.stringify(flightQuery, null, 2));
      
      const flights = await Flight.find(flightQuery)
        .select('flight_number airline from_airport to_airport from_airport_code to_airport_code departure_date departure_time arrival_time duration classes stops ratings image_url')
        .sort({ departure_time: 1 })
        .limit(50);
      
      console.log(`Found ${flights.length} flights`);
      results.flights = flights;
    }

    console.log('Search results:', {
      buses: results.buses.length,
      trains: results.trains.length,
      flights: results.flights.length
    });

    res.json({
      success: true,
      data: results,
      search_params: {
        from,
        to,
        date,
        type
      },
      counts: {
        buses: results.buses.length,
        trains: results.trains.length,
        flights: results.flights.length,
        total: results.buses.length + results.trains.length + results.flights.length
      }
    });
  } catch (error) {
    console.error('Search transport error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching transport',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

