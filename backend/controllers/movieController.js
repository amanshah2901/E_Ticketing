// backend/controllers/movieController.js
import Movie from '../models/Movie.js';
import Booking from '../models/Booking.js';
import Seat from '../models/Seat.js';
import ShowInstance from '../models/ShowInstance.js';
import mongoose from 'mongoose';
import * as omdbService from '../utils/omdbService.js';

/* -------------------------------
   OMDB: Search and Details (with caching)
---------------------------------*/
export const getMoviesFromAPI = async (req, res) => {
  try {
    const { search, page = 1 } = req.query;

    if (!search || search.trim() === '') {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: 'Please provide a search term'
      });
    }

    const result = await omdbService.searchMovies(search, page);

    if (result.success) {
      res.json({
        success: true,
        data: result.movies,
        total: result.total,
        page: result.page
      });
    } else {
      res.json({
        success: true,
        data: [],
        total: 0,
        message: result.error || 'No movies found'
      });
    }
  } catch (error) {
    console.error('OMDB API error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movies from external API',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const getMovieDetailsFromAPI = async (req, res) => {
  try {
    const { imdbId } = req.params;

    if (!imdbId) {
      return res.status(400).json({ success: false, message: 'imdbId required' });
    }

    const result = await omdbService.getMovieDetails(imdbId);

    if (result.success) {
      res.json({
        success: true,
        data: result
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.error || 'Movie not found'
      });
    }
  } catch (error) {
    console.error('OMDB details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movie details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Import movie from OMDB to database
 */
export const importMovieFromOMDB = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { imdbId, ...additionalData } = req.body;

    if (!imdbId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'imdbId is required'
      });
    }

    // Check if movie already exists
    const existing = await Movie.findOne({ imdb_id: imdbId }).session(session);
    if (existing) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Movie with this IMDB ID already exists',
        data: existing
      });
    }

    // Import movie data from OMDB
    const movieData = await omdbService.importMovieFromOMDB(imdbId, additionalData);

    // Create movie
    const movie = new Movie(movieData);
    await movie.save({ session });

    // Create show instances if showtimes provided
    const showInstances = await createShowInstancesFromMovie(movie, session);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Movie imported successfully from OMDB',
      data: {
        movie,
        show_instances_created: showInstances.length
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Import movie from OMDB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing movie from OMDB',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Import latest movies from OMDB API
 * Fetches latest movies and imports them automatically
 */
export const importLatestMovies = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { limit = 20, year, theaters, basePrice = 200, totalSeats = 100 } = req.body;

    // Get latest movies from OMDB
    const latestMoviesResult = await omdbService.getLatestMovies(limit, year || new Date().getFullYear());

    if (!latestMoviesResult.success || latestMoviesResult.movies.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'No latest movies found from OMDB',
        data: latestMoviesResult
      });
    }

    const defaultTheaters = theaters || [
      { name: 'PVR Cinemas', address: '123 Main Street, City Center', city: 'Mumbai' },
      { name: 'INOX Cinemas', address: '456 Park Avenue, Downtown', city: 'Mumbai' },
      { name: 'Cinepolis', address: '789 Mall Road, Shopping District', city: 'Mumbai' }
    ];

    const imported = [];
    const skipped = [];
    const errors = [];

    // Process each movie
    for (const movieInfo of latestMoviesResult.movies) {
      try {
        // Check if movie already exists
        const existing = await Movie.findOne({ imdb_id: movieInfo.imdb_id }).session(session);
        if (existing) {
          skipped.push({
            imdb_id: movieInfo.imdb_id,
            title: movieInfo.title,
            reason: 'Already exists'
          });
          continue;
        }

        // Get full movie details
        const movieDetails = await omdbService.getMovieDetails(movieInfo.imdb_id);
        
        if (!movieDetails.success) {
          errors.push({
            imdb_id: movieInfo.imdb_id,
            title: movieInfo.title,
            error: movieDetails.error || 'Failed to fetch details'
          });
          continue;
        }

        // Parse and format movie data
        const runtime = parseInt(movieDetails.runtime?.replace(/\D/g, '')) || 120;
        const genres = movieDetails.genre?.split(',').map(g => g.trim()) || [];
        const primaryGenre = genres[0] || 'Action';
        const languages = movieDetails.language?.split(',').map(l => l.trim()) || [];
        const primaryLanguage = languages[0] || 'English';

        const ratingMap = {
          'G': 'U',
          'PG': 'U',
          'PG-13': 'UA',
          'R': 'A',
          'NC-17': 'A'
        };
        const rating = ratingMap[movieDetails.rated] || 'UA';

        const cast = movieDetails.actors?.split(',').map(a => a.trim()).slice(0, 5) || [];

        // Generate showtimes (7 days, multiple theaters, multiple times)
        const baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + 1); // Start from tomorrow
        const showtimes = [];

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const showDate = new Date(baseDate);
          showDate.setDate(baseDate.getDate() + dayOffset);

          // Select 2-3 random theaters for each date
          const selectedTheaters = defaultTheaters
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.floor(Math.random() * 2) + 2);

          for (const theater of selectedTheaters) {
            const timeSlots = [
              { time: '10:00 AM', price: basePrice + Math.floor(Math.random() * 50) },
              { time: '01:30 PM', price: basePrice + Math.floor(Math.random() * 50) },
              { time: '05:00 PM', price: basePrice + Math.floor(Math.random() * 50) },
              { time: '08:30 PM', price: basePrice + Math.floor(Math.random() * 50) }
            ];

            showtimes.push({
              theatre: theater.name,
              theatre_address: theater.address,
              date: showDate,
              location: theater.city,
              timeslots: timeSlots
            });
          }
        }

        // Create movie data
        const movieData = {
          title: movieDetails.title,
          description: movieDetails.plot || '',
          genre: primaryGenre,
          duration: runtime,
          language: primaryLanguage,
          rating: rating,
          poster_url: movieDetails.poster_url,
          imdb_id: movieDetails.imdb_id,
          imdb_rating: movieDetails.imdb_rating,
          director: movieDetails.director || '',
          cast: cast,
          // Legacy fields
          theater: defaultTheaters[0].name,
          theater_address: defaultTheaters[0].address,
          show_date: baseDate,
          show_time: '10:00 AM',
          total_seats: totalSeats,
          available_seats: totalSeats,
          price: basePrice,
          status: 'active',
          featured: false,
          showtimes: showtimes
        };

        const movie = new Movie(movieData);
        await movie.save({ session });

        // Create show instances
        await createShowInstancesFromMovie(movie, session);

        imported.push({
          _id: movie._id,
          title: movie.title,
          imdb_id: movie.imdb_id
        });
      } catch (error) {
        console.error(`Error importing movie ${movieInfo.imdb_id}:`, error);
        errors.push({
          imdb_id: movieInfo.imdb_id,
          title: movieInfo.title,
          error: error.message
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: `Successfully imported ${imported.length} latest movies`,
      data: {
        imported: imported.length,
        skipped: skipped.length,
        errors: errors.length,
        movies: imported,
        skipped_details: skipped,
        error_details: errors
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Import latest movies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error importing latest movies',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/* -------------------------------
   MOVIE CRUD + listing (legacy + new)
---------------------------------*/
export const getMovies = async (req, res) => {
  try {
    const {
      status = 'active',
      limit = 10,
      page = 1,
      genre,
      language,
      search,
      featured,
      sortBy = 'show_date',
      sortOrder = 'asc'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;

    if (genre && genre !== 'all') filter.genre = new RegExp(genre, 'i');
    if (language && language !== 'all') filter.language = new RegExp(language, 'i');

    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { theatre: new RegExp(search, 'i') }
      ];
    }

    if (featured !== undefined) filter.featured = featured === 'true';

    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Increase default limit to show more movies
    const actualLimit = parseInt(limit) > 0 ? parseInt(limit) : 100;
    
    const movies = await Movie.find(filter)
      .limit(actualLimit)
      .skip((parseInt(page) - 1) * actualLimit)
      .sort(sortConfig)
      .select('-createdAt -updatedAt -__v');

    const total = await Movie.countDocuments(filter);

    // unique filter data
    const genres = await Movie.distinct('genre', { status: 'active' });
    const languages = await Movie.distinct('language', { status: 'active' });

    res.json({
      success: true,
      data: {
        movies,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        },
        filters: {
          genres: genres.sort(),
          languages: languages.sort()
        }
      }
    });
  } catch (error) {
    console.error('Get movies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movies'
    });
  }
};

export const getFeaturedMovies = async (req, res) => {
  try {
    const movies = await Movie.find({
      status: 'active',
      featured: true
    })
      .sort({ show_date: 1 })
      .limit(6)
      .select('title poster_url show_date show_time theatre price');

    res.json({
      success: true,
      data: movies
    });
  } catch (error) {
    console.error('Get featured movies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching featured movies'
    });
  }
};

export const getMovieById = async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);

    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // legacy available seats
    const availableSeats = await Seat.countDocuments({
      item_type: 'movie',
      item_id: movie._id,
      status: 'available'
    });

    // fetch show instances for this movie (BookMyShow style)
    const showInstances = await ShowInstance.find({ movie_id: movie._id })
      .sort({ date: 1, time: 1 })
      .lean();

    // Group showtimes by date and theatre
    const showtimesByDate = {};
    showInstances.forEach(show => {
      const dateKey = show.date.toISOString().split('T')[0];
      if (!showtimesByDate[dateKey]) {
        showtimesByDate[dateKey] = {};
      }
      if (!showtimesByDate[dateKey][show.theatre]) {
        showtimesByDate[dateKey][show.theatre] = [];
      }
      showtimesByDate[dateKey][show.theatre].push({
        show_id: show._id,
        time: show.time,
        base_price: show.base_price,
        available_seats: show.available_seats,
        total_seats: show.total_seats
      });
    });

    const similarMovies = await Movie.find({
      _id: { $ne: movie._id },
      genre: movie.genre,
      status: 'active'
    })
      .limit(4)
      .select('title poster_url show_date show_time theatre price');

    res.json({
      success: true,
      data: {
        ...movie.toObject(),
        available_seats_count: availableSeats,
        similar_movies: similarMovies,
        show_instances: showInstances, // All show instances
        showtimes_by_date: showtimesByDate // Grouped by date and theatre
      }
    });
  } catch (error) {
    console.error('Get movie by ID error:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid movie ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching movie'
    });
  }
};

/* -------------------------------
   Create / Update / Delete Movie
   When creating/updating we also create ShowInstances + seats.
---------------------------------*/
export const createMovie = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const movieData = req.body;

    // basic validation for legacy show_date if provided
    if (movieData.show_date) {
      const showDate = new Date(movieData.show_date);
      if (showDate < new Date()) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Show date must be in the future'
        });
      }
    }

    const movie = new Movie(movieData);
    await movie.save({ session });

    // Create ShowInstances from movie.showtimes (new system) or legacy fields
    const showInstances = await createShowInstancesFromMovie(movie, session);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      message: 'Movie created successfully',
      data: {
        movie,
        show_instances_created: showInstances.length
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Create movie error:', error);

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
      message: 'Error creating movie'
    });
  }
};

export const updateMovie = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const movie = await Movie.findById(req.params.id).session(session);

    if (!movie) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // Protect seat reduction if bookings exist
    const existingBookings = await Booking.countDocuments({
      item_id: movie._id,
      booking_type: 'movie',
      booking_status: { $in: ['confirmed', 'pending'] }
    });

    if (existingBookings > 0 && req.body.total_seats && req.body.total_seats < movie.total_seats) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot reduce total seats as there are existing bookings'
      });
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) movie[key] = req.body[key];
    });

    await movie.save({ session });

    // If showtimes changed (new BookMyShow system) create/patch show instances:
    if (req.body.showtimes && Array.isArray(req.body.showtimes)) {
      // naive approach: create any missing instances (do not delete existing)
      await createShowInstancesFromMovie(movie, session, { upsertOnly: true });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Movie updated successfully',
      data: movie
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Update movie error:', error);

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
      message: 'Error updating movie'
    });
  }
};

export const deleteMovie = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const movie = await Movie.findById(req.params.id).session(session);

    if (!movie) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    const existingBookings = await Booking.countDocuments({
      item_id: movie._id,
      booking_type: 'movie'
    });

    if (existingBookings > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete movie with existing bookings'
      });
    }

    // delete seats tied to legacy 'movie' item_type
    await Seat.deleteMany({ item_type: 'movie', item_id: movie._id }).session(session);

    // delete show instances and their seats
    const showInstances = await ShowInstance.find({ movie_id: movie._id }).session(session);
    const showIds = showInstances.map(s => s._id);
    if (showIds.length > 0) {
      await Seat.deleteMany({ item_type: 'show', item_id: { $in: showIds } }).session(session);
      await ShowInstance.deleteMany({ _id: { $in: showIds } }).session(session);
    }

    await Movie.findByIdAndDelete(req.params.id).session(session);

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: 'Movie deleted successfully'
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('Delete movie error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting movie'
    });
  }
};

/* -------------------------------
   ShowInstance helpers & endpoints
---------------------------------*/

/**
 * createShowInstancesFromMovie(movie, session, options)
 * - Creates ShowInstance documents for each entry in movie.showtimes
 * - For legacy movies without showtimes, creates a single show instance using movie.show_date/show_time
 * - Generates seats for each created ShowInstance
 *
 * options:
 *  - upsertOnly: if true, only create instances that don't already exist; do not update/delete existing
 */
const createShowInstancesFromMovie = async (movie, session = null, options = {}) => {
  const createdInstances = [];
  const s = session || await mongoose.startSession();

  let localSessionStarted = false;
  if (!session) {
    s.startTransaction();
    localSessionStarted = true;
  }

  try {
    // helper to create one show instance and seats
    const createOne = async ({ theatre, theatre_address, date, time, location, base_price, total_seats }) => {
      // ensure date/time present
      if (!date || !time) return null;
      const showDate = new Date(date);
      if (isNaN(showDate.getTime())) return null;

      // dedupe by movie+date+time (unique index in ShowInstance)
      const existing = await ShowInstance.findOne({ movie_id: movie._id, date: showDate, time }).session(s);
      if (existing) {
        return existing;
      }

      const inst = new ShowInstance({
        movie_id: movie._id,
        theatre: theatre || movie.theatre || 'Unknown Theatre',
        theatre_address: theatre_address || movie.theatre_address || '',
        date: showDate,
        time,
        location: location || '',
        base_price: base_price ?? movie.price ?? 0,
        total_seats: total_seats ?? movie.total_seats ?? 100,
        available_seats: total_seats ?? movie.available_seats ?? movie.total_seats ?? 100,
        metadata: {}
      });

      await inst.save({ session: s });

      // generate seats for this show instance
      await generateSeatsForShowInstance(inst._id, inst.total_seats, inst.base_price, s);

      return inst;
    };

    // If movie.showtimes exists (BookMyShow style)
    if (Array.isArray(movie.showtimes) && movie.showtimes.length > 0) {
      for (const show of movie.showtimes) {
        // show may represent theatre + date + timeslots[]
        // If show.timeslots exists we create one ShowInstance per timeslot
        if (Array.isArray(show.timeslots) && show.timeslots.length > 0) {
          for (const slot of show.timeslots) {
            const date = show.date;
            const time = slot.time;
            const base_price = slot.price ?? movie.price;
            const total_seats = movie.total_seats ?? 100;
            const inst = await createOne({
              theatre: show.theatre,
              theatre_address: show.theatre_address,
              date,
              time,
              location: show.location,
              base_price,
              total_seats
            });
            if (inst) createdInstances.push(inst);
          }
        } else {
          // fallback: show contains a singular time field
          const inst = await createOne({
            theatre: show.theatre,
            theatre_address: show.theatre_address,
            date: show.date,
            time: show.time || movie.show_time,
            location: show.location,
            base_price: show.base_price ?? movie.price,
            total_seats: show.total_seats ?? movie.total_seats
          });
          if (inst) createdInstances.push(inst);
        }
      }
    } else {
      // legacy: create a single show instance based on movie.show_date/show_time
      if (movie.show_date && movie.show_time) {
        const inst = await createOne({
          theatre: movie.theatre,
          theatre_address: movie.theatre_address,
          date: movie.show_date,
          time: movie.show_time,
          base_price: movie.price,
          total_seats: movie.total_seats
        });
        if (inst) createdInstances.push(inst);
      }
    }

    if (localSessionStarted) {
      await s.commitTransaction();
      s.endSession();
    }

    return createdInstances;
  } catch (err) {
    if (localSessionStarted) {
      await s.abortTransaction();
      s.endSession();
    }
    console.error('createShowInstancesFromMovie error:', err);
    throw err;
  }
};

/**
 * generateSeatsForShowInstance(showInstanceId, totalSeats, basePrice, session)
 * - Creates Seat documents with item_type 'show' and item_id = showInstanceId
 */
const generateSeatsForShowInstance = async (showInstanceId, totalSeats = 100, basePrice = 200, session = null) => {
  try {
    // seat rows for movies
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatsPerRow = Math.ceil(totalSeats / rows.length);
    const seats = [];

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      for (let c = 1; c <= seatsPerRow; c++) {
        const seatNumber = `${row}${c}`;

        let seatType = 'regular';
        let price = basePrice;

        if (row === 'A' || row === 'B') {
          seatType = 'vip';
          price = Math.round(basePrice * 1.5);
        } else if (row === 'C' || row === 'D') {
          seatType = 'premium';
          price = Math.round(basePrice * 1.2);
        }

        seats.push({
          item_type: 'show', // NOTE: show
          item_id: showInstanceId,
          seat_number: seatNumber,
          row,
          column: c,
          seat_type: seatType,
          price,
          status: 'available'
        });

        if (seats.length >= totalSeats) break;
      }
      if (seats.length >= totalSeats) break;
    }

    if (seats.length === 0) return 0;

    // insertMany in batches in case of large number
    const BATCH = 500;
    for (let i = 0; i < seats.length; i += BATCH) {
      const batch = seats.slice(i, i + BATCH);
      await Seat.insertMany(batch, { ordered: false });
    }

    return seats.length;
  } catch (error) {
    // If duplicate key errors happen because show instance already has seats, ignore duplicates
    if (error && error.code === 11000) {
      console.warn('Duplicate seats when generating seats (some seats existed already).');
      return 0;
    }
    console.error('generateSeatsForShowInstance error:', error);
    throw error;
  }
};

/* -------------------------------
   Seat endpoints (movie-level legacy + show-level)
---------------------------------*/

/**
 * getMovieSeats (legacy) => /movies/:movieId/seats
 * returns seats tied to item_type 'movie' (legacy) or aggregated
 */
export const getMovieSeats = async (req, res) => {
  try {
    const { movieId } = req.params;

    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    // legacy seats (item_type 'movie')
    const seats = await Seat.find({
      item_type: 'movie',
      item_id: movieId
    }).sort({ row: 1, column: 1 });

    const groupedSeats = seats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        movie: {
          id: movie._id,
          title: movie.title,
          theatre: movie.theatre,
          show_date: movie.show_date,
          show_time: movie.show_time,
          total_seats: movie.total_seats,
          available_seats: movie.available_seats
        },
        seats: groupedSeats,
        seat_layout: {
          rows: Object.keys(groupedSeats).sort(),
          seats_per_row: Object.values(groupedSeats).length > 0 ? Math.max(...Object.values(groupedSeats).map(row => row.length)) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get movie seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movie seats'
    });
  }
};

/**
 * getShowSeats => /movies/show/:showId/seats
 * returns seats for a specific ShowInstance (BookMyShow style)
 */
export const getShowSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    const show = await ShowInstance.findById(showId);
    if (!show) {
      return res.status(404).json({ success: false, message: 'Show instance not found' });
    }

    // Clean up expired locks before fetching seats
    await Seat.cleanupExpiredLocks();

    const seats = await Seat.find({
      item_type: 'show',
      item_id: show._id
    }).sort({ row: 1, column: 1 });

    // group by row
    const groupedSeats = seats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        show: {
          id: show._id,
          movie_id: show.movie_id,
          theatre: show.theatre,
          date: show.date,
          time: show.time,
          base_price: show.base_price,
          total_seats: show.total_seats,
          available_seats: show.available_seats
        },
        seats: groupedSeats,
        seat_layout: {
          rows: Object.keys(groupedSeats).sort(),
          seats_per_row: Object.values(groupedSeats).length > 0 ? Math.max(...Object.values(groupedSeats).map(row => row.length)) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get show seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching show seats'
    });
  }
};

/**
 * Lock seats for a show (5 minutes)
 * POST /movies/show/:showId/seats/lock
 */
export const lockSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const { seatNumbers } = req.body;
    const userId = req.user?._id?.toString() || req.user?.id || 'anonymous';

    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'seatNumbers array is required'
      });
    }

    const show = await ShowInstance.findById(showId);
    if (!show) {
      return res.status(404).json({ success: false, message: 'Show instance not found' });
    }

    // Find seats
    const seats = await Seat.find({
      item_type: 'show',
      item_id: show._id,
      seat_number: { $in: seatNumbers }
    });

    if (seats.length !== seatNumbers.length) {
      return res.status(400).json({
        success: false,
        message: 'Some seats not found'
      });
    }

    // Check if seats are available and not locked by someone else
    const now = new Date();
    for (const seat of seats) {
      if (seat.status === 'booked') {
        return res.status(400).json({
          success: false,
          message: `Seat ${seat.seat_number} is already booked`
        });
      }
      if (seat.is_locked && seat.locked_by !== userId && seat.locked_until > now) {
        return res.status(400).json({
          success: false,
          message: `Seat ${seat.seat_number} is locked by another user`
        });
      }
    }

    // Lock seats for 5 minutes
    const lockedUntil = new Date(Date.now() + 5 * 60 * 1000);
    await Seat.updateMany(
      {
        item_type: 'show',
        item_id: show._id,
        seat_number: { $in: seatNumbers }
      },
      {
        $set: {
          status: 'selected',
          locked_by: userId,
          locked_until: lockedUntil
        }
      }
    );

    res.json({
      success: true,
      message: 'Seats locked successfully',
      data: {
        locked_seats: seatNumbers,
        locked_until: lockedUntil
      }
    });
  } catch (error) {
    console.error('Lock seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error locking seats'
    });
  }
};

/**
 * Unlock seats for a show
 * POST /movies/show/:showId/seats/unlock
 */
export const unlockSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const { seatNumbers } = req.body;
    const userId = req.user?._id?.toString() || req.user?.id || 'anonymous';

    if (!Array.isArray(seatNumbers) || seatNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'seatNumbers array is required'
      });
    }

    // Unlock seats (only if locked by this user)
    await Seat.updateMany(
      {
        item_type: 'show',
        item_id: showId,
        seat_number: { $in: seatNumbers },
        locked_by: userId,
        status: 'selected'
      },
      {
        $set: {
          status: 'available',
          locked_by: null,
          locked_until: null
        }
      }
    );

    res.json({
      success: true,
      message: 'Seats unlocked successfully'
    });
  } catch (error) {
    console.error('Unlock seats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unlocking seats'
    });
  }
};

/* -------------------------------
   Export list of helper endpoints for admin usage
---------------------------------*/

/**
 * POST /movies/:id/create-show-instances
 * Admin helper to (re)create show instances from the movie.showtimes
 */
export const createShowInstancesForMovie = async (req, res) => {
  const movieId = req.params.id;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const movie = await Movie.findById(movieId).session(session);
    if (!movie) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    const created = await createShowInstancesFromMovie(movie, session, { upsertOnly: true });

    await session.commitTransaction();
    session.endSession();

    res.json({
      success: true,
      message: `Created ${created.length} show instances (or they already existed).`,
      created_count: created.length
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('createShowInstancesForMovie error:', error);
    res.status(500).json({ success: false, message: 'Failed creating show instances' });
  }
};

/**
 * Get showtimes for a movie
 */
export const getMovieShowtimes = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const movie = await Movie.findById(id);
    if (!movie) {
      return res.status(404).json({
        success: false,
        message: 'Movie not found'
      });
    }

    // First, try to get from ShowInstance (BookMyShow style)
    const filter = { movie_id: id };
    
    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    } else {
      // Only show future dates
      filter.date = { $gte: new Date() };
    }

    let showInstances = await ShowInstance.find(filter)
      .sort({ date: 1, time: 1 })
      .lean();

    // If no ShowInstances exist, try to create them from movie.showtimes
    if (showInstances.length === 0 && movie.showtimes && movie.showtimes.length > 0) {
      // Create show instances from movie.showtimes
      try {
        await createShowInstancesFromMovie(movie);
        // Fetch again
        showInstances = await ShowInstance.find(filter)
          .sort({ date: 1, time: 1 })
          .lean();
      } catch (err) {
        console.error('Error creating show instances:', err);
      }
    }

    // If still no ShowInstances, fallback to movie.showtimes array
    if (showInstances.length === 0 && movie.showtimes && movie.showtimes.length > 0) {
      const grouped = {};
      movie.showtimes.forEach(showtime => {
        const showDate = new Date(showtime.date);
        // Skip past dates
        if (showDate < new Date()) return;
        
        // Apply date filter if provided
        if (date) {
          const filterDate = new Date(date);
          if (showDate.toISOString().split('T')[0] !== filterDate.toISOString().split('T')[0]) {
            return;
          }
        }
        
        const dateKey = showDate.toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = {};
        }
        if (!grouped[dateKey][showtime.theatre]) {
          grouped[dateKey][showtime.theatre] = {
            theatre: showtime.theatre,
            theatre_address: showtime.theatre_address || '',
            location: showtime.location || '',
            shows: []
          };
        }
        
        // Add timeslots
        if (showtime.timeslots && showtime.timeslots.length > 0) {
          showtime.timeslots.forEach(slot => {
            grouped[dateKey][showtime.theatre].shows.push({
              show_id: `temp_${dateKey}_${showtime.theatre}_${slot.time}`,
              time: slot.time,
              base_price: slot.price || movie.price || 200,
              available_seats: movie.available_seats || 0,
              total_seats: movie.total_seats || 100
            });
          });
        }
      });

      return res.json({
        success: true,
        data: {
          movie_id: id,
          movie_title: movie.title,
          showtimes: grouped,
          dates: Object.keys(grouped).sort()
        }
      });
    }

    // Group ShowInstances by date and theatre
    const grouped = {};
    showInstances.forEach(show => {
      const dateKey = show.date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      if (!grouped[dateKey][show.theatre]) {
        grouped[dateKey][show.theatre] = {
          theatre: show.theatre,
          theatre_address: show.theatre_address || '',
          location: show.location || '',
          shows: []
        };
      }
      grouped[dateKey][show.theatre].shows.push({
        show_id: show._id.toString(),
        time: show.time,
        base_price: show.base_price,
        available_seats: show.available_seats,
        total_seats: show.total_seats
      });
    });

    res.json({
      success: true,
      data: {
        movie_id: id,
        movie_title: movie.title,
        showtimes: grouped,
        dates: Object.keys(grouped).sort()
      }
    });
  } catch (error) {
    console.error('Get movie showtimes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching showtimes'
    });
  }
};
