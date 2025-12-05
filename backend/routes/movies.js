// backend/routes/movies.js
import express from 'express'
import {
  getMovies,
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getMovieSeats,        // legacy seats
  getFeaturedMovies,
  getMovieShowtimes,    // Get showtimes for a movie

  // OMDB external API
  getMoviesFromAPI,
  getMovieDetailsFromAPI,
  importMovieFromOMDB,
  importLatestMovies,

  // BookMyShow system
  getShowSeats,
  createShowInstancesForMovie
} from '../controllers/movieController.js'

import auth from '../middleware/auth.js'
import admin from '../middleware/admin.js'

const router = express.Router()

/* ------------------------------------------
   🔹 OMDB EXTERNAL API ROUTES
-------------------------------------------*/
router.get('/api/search', getMoviesFromAPI)
router.get('/api/details/:imdbId', getMovieDetailsFromAPI)
router.post('/api/import', auth, admin, importMovieFromOMDB) // Admin only - import single movie
router.post('/api/import-latest', auth, admin, importLatestMovies) // Admin only - import latest movies

/* ------------------------------------------
   🔹 BOOKMYSHOW STYLE SHOW-INSTANCE ROUTES
-------------------------------------------*/

// Get seats for a specific show instance
router.get('/show/:showId/seats', getShowSeats)

// Admin: create missing show instances from movie.showtimes
router.post('/:id/create-show-instances', auth, admin, createShowInstancesForMovie)

/* ------------------------------------------
   🔹 PUBLIC MOVIE ROUTES
-------------------------------------------*/

router.get('/', getMovies)
router.get('/featured', getFeaturedMovies)

// Get showtimes for a movie
router.get('/:id/showtimes', getMovieShowtimes)

// legacy seat endpoint (item_type = 'movie')
router.get('/:movieId/seats', getMovieSeats)

router.get('/:id', getMovieById)

/* ------------------------------------------
   🔹 ADMIN MOVIE ROUTES
-------------------------------------------*/

router.post('/', auth, admin, createMovie)
router.put('/:id', auth, admin, updateMovie)
router.delete('/:id', auth, admin, deleteMovie)

export default router
