// backend/controllers/movieController.js
import Movie from '../models/Movie.js';
import Booking from '../models/Booking.js';
import Seat from '../models/Seat.js';
import ShowInstance from '../models/ShowInstance.js';
import axios from 'axios';
import mongoose from 'mongoose';

const OMDB_API_KEY = process.env.OMDB_API_KEY || '';

/* -------------------------------
   OMDB: Search and Details
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

    const response = await axios.get(
      `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(search)}&type=movie&page=${page}`
    );

    if (response.data.Response === 'True') {
      const movies = response.data.Search.map(movie => ({
        title: movie.Title,
        year: movie.Year,
        imdb_id: movie.imdbID,
        poster_url: movie.Poster !== 'N/A' ? movie.Poster : '/default-movie-poster.jpg',
        type: movie.Type
      }));

      res.json({
        success: true,
        data: movies,
        total: parseInt(response.data.totalResults) || 0,
        page: parseInt(page)
      });
    } else {
      res.json({
        success: true,
        data: [],
        total: 0,
        message: response.data.Error || 'No movies found'
      });
    }
  } catch (error) {
    console.error('OMDB API error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movies from external API'
    });
  }
};

export const getMovieDetailsFromAPI = async (req, res) => {
  try {
    const { imdbId } = req.params;

    if (!imdbId) {
      return res.status(400).json({ success: false, message: 'imdbId required' });
    }

    const response = await axios.get(
      `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`
    );

    if (response.data.Response === 'True') {
      const movieDetails = {
        title: response.data.Title,
        year: response.data.Year,
        rated: response.data.Rated,
        released: response.data.Released,
        runtime: response.data.Runtime,
        genre: response.data.Genre,
        director: response.data.Director,
        writer: response.data.Writer,
        actors: response.data.Actors,
        plot: response.data.Plot,
        language: response.data.Language,
        country: response.data.Country,
        awards: response.data.Awards,
        poster_url: response.data.Poster !== 'N/A' ? response.data.Poster : '/default-movie-poster.jpg',
        ratings: response.data.Ratings,
        imdb_rating: response.data.imdbRating,
        imdb_votes: response.data.imdbVotes,
        imdb_id: response.data.imdbID,
        type: response.data.Type,
        box_office: response.data.BoxOffice,
        production: response.data.Production,
        website: response.data.Website
      };

      res.json({
        success: true,
        data: movieDetails
      });
    } else {
      res.status(404).json({
        success: false,
        message: response.data.Error || 'Movie not found'
      });
    }
  } catch (error) {
    console.error('OMDB details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching movie details'
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

    const movies = await Movie.find(filter)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
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

    // fetch show instances for this movie
    const showInstances = await ShowInstance.find({ movie_id: movie._id }).sort({ date: 1, time: 1 }).lean();

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
        show_instances: showInstances // NEW: BookMyShow style
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
