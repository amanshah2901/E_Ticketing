/**
 * Script to import latest movies from OMDB API
 * Can be run manually or via CRON job
 * 
 * Usage:
 *   node backend/scripts/importMovies.js [limit] [year]
 * 
 * Examples:
 *   node backend/scripts/importMovies.js 20 2024
 *   node backend/scripts/importMovies.js 10
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Movie from '../models/Movie.js';
import ShowInstance from '../models/ShowInstance.js';
import * as omdbService from '../utils/omdbService.js';

dotenv.config();

const importLatestMovies = async (limit = 20, year = new Date().getFullYear()) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`🎬 Starting import of ${limit} latest movies from OMDB (year: ${year})...`);

    // Get latest movies from OMDB
    const latestMoviesResult = await omdbService.getLatestMovies(limit, year);

    if (!latestMoviesResult.success || latestMoviesResult.movies.length === 0) {
      await session.abortTransaction();
      session.endSession();
      console.log('❌ No latest movies found from OMDB');
      return;
    }

    console.log(`📋 Found ${latestMoviesResult.movies.length} movies from OMDB`);

    const defaultTheaters = [
      { name: 'PVR Cinemas', address: '123 Main Street, City Center', city: 'Mumbai' },
      { name: 'INOX Cinemas', address: '456 Park Avenue, Downtown', city: 'Mumbai' },
      { name: 'Cinepolis', address: '789 Mall Road, Shopping District', city: 'Mumbai' }
    ];

    const imported = [];
    const skipped = [];
    const errors = [];
    const basePrice = 200;
    const totalSeats = 100;

    // Process each movie
    for (const movieInfo of latestMoviesResult.movies) {
      try {
        // Check if movie already exists
        const existing = await Movie.findOne({ imdb_id: movieInfo.imdb_id }).session(session);
        if (existing) {
          console.log(`⏭️  Skipping ${movieInfo.title} - already exists`);
          skipped.push({
            imdb_id: movieInfo.imdb_id,
            title: movieInfo.title,
            reason: 'Already exists'
          });
          continue;
        }

        console.log(`📥 Fetching details for: ${movieInfo.title}...`);

        // Get full movie details
        const movieDetails = await omdbService.getMovieDetails(movieInfo.imdb_id);
        
        if (!movieDetails.success) {
          console.log(`❌ Failed to fetch details for ${movieInfo.title}`);
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

        // Create show instances and seats
        const Seat = (await import('../models/Seat.js')).default;
        
        for (const showtime of movie.showtimes) {
          if (!showtime.timeslots || showtime.timeslots.length === 0) continue;

          const showDate = new Date(showtime.date);
          if (showDate < new Date()) continue;

          for (const slot of showtime.timeslots) {
            const existing = await ShowInstance.findOne({
              movie_id: movie._id,
              date: showDate,
              time: slot.time,
              theatre: showtime.theatre
            }).session(session);

            if (existing) continue;

            const showInstance = new ShowInstance({
              movie_id: movie._id,
              theatre: showtime.theatre,
              theatre_address: showtime.theatre_address || '',
              date: showDate,
              time: slot.time,
              location: showtime.location || '',
              base_price: slot.price || movie.price || 200,
              total_seats: movie.total_seats || 100,
              available_seats: movie.available_seats || movie.total_seats || 100,
              status: 'active'
            });

            await showInstance.save({ session });

            // Generate seats for this show instance
            const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            const seatsPerRow = Math.ceil(showInstance.total_seats / rows.length);

            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
              const row = rows[rowIndex];
              for (let col = 1; col <= seatsPerRow; col++) {
                const seatNumber = `${row}${col}`;
                if ((rowIndex * seatsPerRow + col) > showInstance.total_seats) break;

                let seatType = 'regular';
                let price = showInstance.base_price;

                if (row === 'A' || row === 'B') {
                  seatType = 'vip';
                  price = Math.round(showInstance.base_price * 1.5);
                } else if (row === 'C' || row === 'D') {
                  seatType = 'premium';
                  price = Math.round(showInstance.base_price * 1.2);
                }

                await Seat.create([{
                  item_type: 'show',
                  item_id: showInstance._id,
                  seat_number: seatNumber,
                  row: row,
                  column: col,
                  seat_type: seatType,
                  price: price,
                  status: 'available'
                }], { session });
              }
            }
          }
        }

        console.log(`✅ Imported: ${movie.title}`);
        imported.push({
          _id: movie._id,
          title: movie.title,
          imdb_id: movie.imdb_id
        });
      } catch (error) {
        console.error(`❌ Error importing movie ${movieInfo.imdb_id}:`, error.message);
        errors.push({
          imdb_id: movieInfo.imdb_id,
          title: movieInfo.title,
          error: error.message
        });
      }
    }

    await session.commitTransaction();
    session.endSession();

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported.length}`);
    console.log(`   ⏭️  Skipped: ${skipped.length}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (imported.length > 0) {
      console.log('\n🎬 Successfully imported movies:');
      imported.forEach(m => console.log(`   - ${m.title}`));
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(e => console.log(`   - ${e.title}: ${e.error}`));
    }

    process.exit(0);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error('❌ Import latest movies error:', error);
    process.exit(1);
  }
};

// Main execution
(async () => {
  try {
    await connectDB();
    
    const limit = parseInt(process.argv[2]) || 20;
    const year = parseInt(process.argv[3]) || new Date().getFullYear();

    await importLatestMovies(limit, year);
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
})();

