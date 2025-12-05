import axios from 'axios';
import mongoose from 'mongoose';
import Movie from '../models/Movie.js';

const OMDB_API_KEY = process.env.OMDB_API_KEY || '';
const OMDB_BASE_URL = 'http://www.omdbapi.com/';

// Cache schema for OMDB responses
const omdbCacheSchema = new mongoose.Schema({
  imdb_id: { type: String, required: true, unique: true, index: true },
  search_term: { type: String, index: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  cached_at: { type: Date, default: Date.now, expires: 86400000 } // 24 hours
}, { timestamps: true });

// Create model if it doesn't exist
let OMDBCache;
try {
  OMDBCache = mongoose.model('OMDBCache');
} catch (e) {
  OMDBCache = mongoose.model('OMDBCache', omdbCacheSchema);
}

/**
 * Search movies via OMDB API with caching
 */
export const searchMovies = async (searchTerm, page = 1) => {
  try {
    if (!OMDB_API_KEY) {
      throw new Error('OMDB_API_KEY not configured');
    }

    // Check cache first
    const cacheKey = `search_${searchTerm.toLowerCase()}_${page}`;
    const cached = await OMDBCache.findOne({ search_term: cacheKey });
    
    if (cached && (Date.now() - cached.cached_at.getTime()) < 86400000) {
      return cached.data;
    }

    // Fetch from OMDB
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: OMDB_API_KEY,
        s: searchTerm,
        type: 'movie',
        page: page
      }
    });

    if (response.data.Response === 'False') {
      return {
        success: false,
        movies: [],
        total: 0,
        error: response.data.Error || 'No movies found'
      };
    }

    const movies = response.data.Search.map(movie => ({
      title: movie.Title,
      year: movie.Year,
      imdb_id: movie.imdbID,
      poster_url: movie.Poster !== 'N/A' ? movie.Poster : null,
      type: movie.Type
    }));

    const result = {
      success: true,
      movies,
      total: parseInt(response.data.totalResults) || 0,
      page: parseInt(page)
    };

    // Cache the result
    await OMDBCache.findOneAndUpdate(
      { search_term: cacheKey },
      {
        search_term: cacheKey,
        data: result,
        cached_at: new Date()
      },
      { upsert: true, new: true }
    );

    return result;
  } catch (error) {
    console.error('OMDB search error:', error);
    throw error;
  }
};

/**
 * Get movie details from OMDB API with caching
 */
export const getMovieDetails = async (imdbId) => {
  try {
    if (!OMDB_API_KEY) {
      throw new Error('OMDB_API_KEY not configured');
    }

    // Check cache first
    const cached = await OMDBCache.findOne({ imdb_id: imdbId });
    
    if (cached && (Date.now() - cached.cached_at.getTime()) < 86400000) {
      return cached.data;
    }

    // Fetch from OMDB
    const response = await axios.get(OMDB_BASE_URL, {
      params: {
        apikey: OMDB_API_KEY,
        i: imdbId,
        plot: 'full'
      }
    });

    if (response.data.Response === 'False') {
      return {
        success: false,
        error: response.data.Error || 'Movie not found'
      };
    }

    const movieDetails = {
      success: true,
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
      poster_url: response.data.Poster !== 'N/A' ? response.data.Poster : null,
      ratings: response.data.Ratings || [],
      imdb_rating: response.data.imdbRating ? parseFloat(response.data.imdbRating) : 0,
      imdb_votes: response.data.imdbVotes ? parseInt(response.data.imdbVotes.replace(/,/g, '')) : 0,
      imdb_id: response.data.imdbID,
      type: response.data.Type,
      box_office: response.data.BoxOffice,
      production: response.data.Production,
      website: response.data.Website
    };

    // Cache the result
    await OMDBCache.findOneAndUpdate(
      { imdb_id: imdbId },
      {
        imdb_id: imdbId,
        data: movieDetails,
        cached_at: new Date()
      },
      { upsert: true, new: true }
    );

    return movieDetails;
  } catch (error) {
    console.error('OMDB details error:', error);
    throw error;
  }
};

/**
 * Import movie from OMDB to database
 */
export const importMovieFromOMDB = async (imdbId, additionalData = {}) => {
  try {
    const omdbData = await getMovieDetails(imdbId);
    
    if (!omdbData.success) {
      throw new Error(omdbData.error || 'Failed to fetch movie details');
    }

    // Parse runtime (e.g., "142 min" -> 142)
    const runtime = parseInt(omdbData.runtime?.replace(/\D/g, '')) || 120;
    
    // Parse genre (comma-separated string -> first genre)
    const genres = omdbData.genre?.split(',').map(g => g.trim()) || [];
    const primaryGenre = genres[0] || 'Action';

    // Parse language (comma-separated -> first language)
    const languages = omdbData.language?.split(',').map(l => l.trim()) || [];
    const primaryLanguage = languages[0] || 'English';

    // Parse rating (e.g., "PG-13" -> "UA")
    const ratingMap = {
      'G': 'U',
      'PG': 'U',
      'PG-13': 'UA',
      'R': 'A',
      'NC-17': 'A'
    };
    const rating = ratingMap[omdbData.rated] || 'UA';

    // Parse cast (comma-separated actors)
    const cast = omdbData.actors?.split(',').map(a => a.trim()).slice(0, 5) || [];

    const movieData = {
      title: omdbData.title,
      description: omdbData.plot || '',
      genre: primaryGenre,
      duration: runtime,
      language: primaryLanguage,
      rating: rating,
      poster_url: omdbData.poster_url,
      imdb_id: omdbData.imdb_id,
      imdb_rating: omdbData.imdb_rating,
      director: omdbData.director || '',
      cast: cast,
      // Legacy fields (required by schema)
      theater: additionalData.theater || 'TBD',
      theater_address: additionalData.theater_address || '',
      show_date: additionalData.show_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      show_time: additionalData.show_time || '10:00 AM',
      total_seats: additionalData.total_seats || 100,
      available_seats: additionalData.available_seats || additionalData.total_seats || 100,
      price: additionalData.price || 200,
      status: 'active',
      featured: additionalData.featured || false,
      ...additionalData
    };

    return movieData;
  } catch (error) {
    console.error('Import movie from OMDB error:', error);
    throw error;
  }
};

/**
 * Fetch latest movies from OMDB API
 * Uses search with "latest" keyword or fetches by year
 */
export const getLatestMovies = async (limit = 20, year = new Date().getFullYear()) => {
  try {
    if (!OMDB_API_KEY) {
      throw new Error('OMDB_API_KEY not configured');
    }

    // Search for movies from current year
    const searchTerms = [
      year.toString(), // Search by year
      'latest',
      'new',
      'recent'
    ];

    const allMovies = [];
    const seenImdbIds = new Set();

    // Try multiple search terms to get variety
    for (const term of searchTerms.slice(0, 2)) { // Use first 2 terms to avoid too many API calls
      try {
        const response = await axios.get(OMDB_BASE_URL, {
          params: {
            apikey: OMDB_API_KEY,
            s: term,
            type: 'movie',
            y: year, // Filter by year
            page: 1
          }
        });

        if (response.data.Response === 'True' && response.data.Search) {
          for (const movie of response.data.Search) {
            if (!seenImdbIds.has(movie.imdbID)) {
              seenImdbIds.add(movie.imdbID);
              allMovies.push({
                imdb_id: movie.imdbID,
                title: movie.Title,
                year: movie.Year,
                poster_url: movie.Poster !== 'N/A' ? movie.Poster : null,
                type: movie.Type
              });
            }
          }
        }

        // If we have enough movies, break
        if (allMovies.length >= limit) {
          break;
        }
      } catch (err) {
        console.error(`Error searching OMDB with term "${term}":`, err.message);
        // Continue with next search term
      }
    }

    // If we still don't have enough, try searching popular movie titles
    if (allMovies.length < limit) {
      const popularTitles = [
        'action', 'comedy', 'drama', 'thriller', 'horror',
        'sci-fi', 'romance', 'adventure', 'fantasy'
      ];

      for (const title of popularTitles.slice(0, 3)) {
        if (allMovies.length >= limit) break;

        try {
          const response = await axios.get(OMDB_BASE_URL, {
            params: {
              apikey: OMDB_API_KEY,
              s: title,
              type: 'movie',
              y: year,
              page: 1
            }
          });

          if (response.data.Response === 'True' && response.data.Search) {
            for (const movie of response.data.Search) {
              if (!seenImdbIds.has(movie.imdbID) && allMovies.length < limit) {
                seenImdbIds.add(movie.imdbID);
                allMovies.push({
                  imdb_id: movie.imdbID,
                  title: movie.Title,
                  year: movie.Year,
                  poster_url: movie.Poster !== 'N/A' ? movie.Poster : null,
                  type: movie.Type
                });
              }
            }
          }
        } catch (err) {
          console.error(`Error searching OMDB with title "${title}":`, err.message);
        }
      }
    }

    return {
      success: true,
      movies: allMovies.slice(0, limit),
      total: allMovies.length
    };
  } catch (error) {
    console.error('Get latest movies error:', error);
    throw error;
  }
};


