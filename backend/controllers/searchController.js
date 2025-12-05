// backend/controllers/searchController.js
import Movie from '../models/Movie.js';
import Bus from '../models/Bus.js';
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
    const [movies, buses, events, tours] = await Promise.all([
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
        .select('operator bus_number from_city to_city route departure_date departure_time price available_seats bus_type amenities ratings')
        .limit(20)
        .sort({ departure_date: 1, price: 1 }),

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
        events,
        tours
      },
      query: searchTerm,
      counts: {
        movies: movies.length,
        buses: buses.length,
        events: events.length,
        tours: tours.length,
        total: movies.length + buses.length + events.length + tours.length
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

