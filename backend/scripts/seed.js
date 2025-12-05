import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import Bus from '../models/Bus.js';
import Event from '../models/Event.js';
import Tour from '../models/Tour.js';
import Seat from '../models/Seat.js';
import ShowInstance from '../models/ShowInstance.js';
import * as omdbService from '../utils/omdbService.js';

// Get current directory and load .env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Helper function to generate showtimes for movies (multiple theaters, dates, times)
const generateShowtimes = (baseDate, theaters, basePrice) => {
  const showtimes = [];
  const timeSlots = ['10:00 AM', '1:30 PM', '5:00 PM', '8:30 PM', '9:30 PM'];
  
  // Generate showtimes for next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const showDate = new Date(baseDate);
    showDate.setDate(showDate.getDate() + dayOffset);
    showDate.setHours(0, 0, 0, 0);
    
    // For each theater
    theaters.forEach((theater, theaterIndex) => {
      // Select 3-4 random time slots per day
      const selectedTimes = timeSlots
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 2) + 3)
        .map(time => ({
          time,
          price: basePrice + (theaterIndex * 50) // Different prices for different theaters
        }));
      
      showtimes.push({
        theatre: theater.name,
        theatre_address: theater.address,
        date: showDate,
        location: theater.city || 'Mumbai',
        timeslots: selectedTimes,
        metadata: {}
      });
    });
  }
  
  return showtimes;
};

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      console.error('Please ensure .env file exists in the backend directory with MONGODB_URI');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Drop problematic text indexes before clearing data
    console.log('🔧 Dropping old indexes...');
    try {
      await Movie.collection.dropIndexes();
      console.log('✅ Dropped Movie indexes');
    } catch (err) {
      console.log('⚠️  No indexes to drop or already dropped');
    }

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Seat.deleteMany({});
    await ShowInstance.deleteMany({});
    await Movie.deleteMany({});
    await Bus.deleteMany({});
    await Event.deleteMany({});
    await Tour.deleteMany({});
    await User.deleteMany({ role: { $ne: 'admin' } }); // Keep admin users

    console.log('✅ Cleared existing data');

    // Create admin user if doesn't exist
    let adminUser = await User.findOne({ email: 'admin@tickethub.com' });
    if (!adminUser) {
      adminUser = await User.create({
        full_name: 'Admin User',
        email: 'admin@tickethub.com',
        password: 'admin123',
        role: 'admin',
        phone: '9876543210',
        email_verified: true
      });
      console.log('✅ Created admin user');
    }

    // Create regular users
    const users = await User.create([
      {
        full_name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '9876543211',
        email_verified: true
      },
      {
        full_name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        phone: '9876543212',
        email_verified: true
      }
    ]);
    console.log('✅ Created regular users');

    // ============================================
    // MOVIES (20+ with dynamic showtimes)
    // ============================================
    console.log('🎬 Creating movies with dynamic showtimes...');
    
    const theaters = [
      { name: 'PVR Cinemas', address: 'Phoenix Marketcity, Kurla, Mumbai', city: 'Mumbai' },
      { name: 'INOX', address: 'R-City Mall, Ghatkopar, Mumbai', city: 'Mumbai' },
      { name: 'Cinepolis', address: 'Andheri West, Mumbai', city: 'Mumbai' },
      { name: 'Carnival Cinemas', address: 'Hiranandani, Powai, Mumbai', city: 'Mumbai' }
    ];

    const movieTemplates = [
      {
        title: 'Pathaan',
        description: 'An Indian spy takes on the leader of a group of mercenaries.',
        genre: 'Action',
        duration: 146,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=300',
        price: 300,
        total_seats: 120,
        director: 'Siddharth Anand',
        cast: ['Shah Rukh Khan', 'Deepika Padukone', 'John Abraham'],
        featured: true
      },
      {
        title: 'RRR',
        description: 'A fictional story about two legendary revolutionaries.',
        genre: 'Action',
        duration: 187,
        language: 'Telugu',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
        price: 350,
        total_seats: 150,
        director: 'S. S. Rajamouli',
        cast: ['N. T. Rama Rao Jr.', 'Ram Charan', 'Alia Bhatt'],
        featured: true
      },
      {
        title: 'Brahmastra',
        description: 'A modern-day fantasy adventure film.',
        genre: 'Fantasy',
        duration: 167,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300',
        price: 400,
        total_seats: 140,
        director: 'Ayan Mukerji',
        cast: ['Ranbir Kapoor', 'Alia Bhatt', 'Amitabh Bachchan'],
        featured: true
      },
      {
        title: 'KGF: Chapter 2',
        description: 'The blood-soaked land of Kolar Gold Fields has a new overlord now.',
        genre: 'Action',
        duration: 168,
        language: 'Kannada',
        rating: 'A',
        poster_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=300',
        price: 320,
        total_seats: 130,
        director: 'Prashanth Neel',
        cast: ['Yash', 'Sanjay Dutt', 'Raveena Tandon'],
        featured: true
      },
      {
        title: 'Vikram',
        description: 'A special agent investigates a murder case.',
        genre: 'Action',
        duration: 175,
        language: 'Tamil',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=300',
        price: 280,
        total_seats: 125,
        director: 'Lokesh Kanagaraj',
        cast: ['Kamal Haasan', 'Vijay Sethupathi', 'Fahadh Faasil'],
        featured: false
      },
      {
        title: 'Gangubai Kathiawadi',
        description: 'The story of a woman who became a powerful figure in Mumbai.',
        genre: 'Drama',
        duration: 152,
        language: 'Hindi',
        rating: 'A',
        poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
        price: 250,
        total_seats: 110,
        director: 'Sanjay Leela Bhansali',
        cast: ['Alia Bhatt', 'Ajay Devgn', 'Vijay Raaz'],
        featured: false
      },
      {
        title: 'Kantara',
        description: 'A story about a man who is at loggerheads with nature.',
        genre: 'Thriller',
        duration: 148,
        language: 'Kannada',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300',
        price: 270,
        total_seats: 115,
        director: 'Rishab Shetty',
        cast: ['Rishab Shetty', 'Sapthami Gowda', 'Kishore'],
        featured: false
      },
      {
        title: 'Drishyam 2',
        description: 'A sequel to the crime thriller about a family covering up a murder.',
        genre: 'Thriller',
        duration: 140,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=300',
        price: 290,
        total_seats: 120,
        director: 'Abhishek Pathak',
        cast: ['Ajay Devgn', 'Tabu', 'Akshaye Khanna'],
        featured: true
      },
      {
        title: 'Pushpa: The Rise',
        description: 'A laborer rises through the ranks of a red sandalwood smuggling syndicate.',
        genre: 'Action',
        duration: 179,
        language: 'Telugu',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=300',
        price: 310,
        total_seats: 135,
        director: 'Sukumar',
        cast: ['Allu Arjun', 'Rashmika Mandanna', 'Fahadh Faasil'],
        featured: true
      },
      {
        title: 'The Kashmir Files',
        description: 'A heart-wrenching story of the exodus of Kashmiri Hindus.',
        genre: 'Drama',
        duration: 170,
        language: 'Hindi',
        rating: 'A',
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=300',
        price: 240,
        total_seats: 105,
        director: 'Vivek Agnihotri',
        cast: ['Anupam Kher', 'Mithun Chakraborty', 'Darshan Kumaar'],
        featured: false
      },
      {
        title: '83',
        description: 'The story of India first Cricket World Cup win in 1983.',
        genre: 'Sports',
        duration: 162,
        language: 'Hindi',
        rating: 'U',
        poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
        price: 260,
        total_seats: 125,
        director: 'Kabir Khan',
        cast: ['Ranveer Singh', 'Deepika Padukone', 'Pankaj Tripathi'],
        featured: false
      },
      {
        title: 'Sooryavanshi',
        description: 'An anti-terrorism squad officer tracks down terrorists.',
        genre: 'Action',
        duration: 145,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300',
        price: 280,
        total_seats: 130,
        director: 'Rohit Shetty',
        cast: ['Akshay Kumar', 'Katrina Kaif', 'Ajay Devgn'],
        featured: false
      },
      {
        title: 'Radhe Shyam',
        description: 'A love story set in Europe.',
        genre: 'Romance',
        duration: 138,
        language: 'Telugu',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=300',
        price: 300,
        total_seats: 120,
        director: 'Radha Krishna Kumar',
        cast: ['Prabhas', 'Pooja Hegde'],
        featured: false
      },
      {
        title: 'Bachchhan Paandey',
        description: 'A journalist goes undercover to expose a gangster.',
        genre: 'Action',
        duration: 150,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=300',
        price: 270,
        total_seats: 115,
        director: 'Farhad Samji',
        cast: ['Akshay Kumar', 'Kriti Sanon', 'Arshad Warsi'],
        featured: false
      },
      {
        title: 'Jersey',
        description: 'A failed cricketer decides to return to the field in his late 30s.',
        genre: 'Sports',
        duration: 162,
        language: 'Hindi',
        rating: 'U',
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=300',
        price: 250,
        total_seats: 110,
        director: 'Gowtam Tinnanuri',
        cast: ['Shahid Kapoor', 'Mrunal Thakur', 'Pankaj Kapur'],
        featured: false
      },
      {
        title: 'Bhool Bhulaiyaa 2',
        description: 'A horror-comedy sequel.',
        genre: 'Horror',
        duration: 143,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
        price: 290,
        total_seats: 125,
        director: 'Anees Bazmee',
        cast: ['Kartik Aaryan', 'Kiara Advani', 'Tabu'],
        featured: true
      },
      {
        title: 'Major',
        description: 'Biographical war drama based on Major Sandeep Unnikrishnan.',
        genre: 'Drama',
        duration: 155,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300',
        price: 260,
        total_seats: 120,
        director: 'Sashi Kiran Tikka',
        cast: ['Adivi Sesh', 'Saiee Manjrekar', 'Prakash Raj'],
        featured: false
      },
      {
        title: 'Sita Ramam',
        description: 'An epic love story set in the 1960s.',
        genre: 'Romance',
        duration: 163,
        language: 'Telugu',
        rating: 'U',
        poster_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=300',
        price: 280,
        total_seats: 115,
        director: 'Hanu Raghavapudi',
        cast: ['Dulquer Salmaan', 'Mrunal Thakur', 'Rashmika Mandanna'],
        featured: false
      },
      {
        title: 'Vikram Vedha',
        description: 'A remake of the Tamil action thriller.',
        genre: 'Action',
        duration: 175,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=300',
        price: 300,
        total_seats: 130,
        director: 'Pushkar-Gayathri',
        cast: ['Hrithik Roshan', 'Saif Ali Khan', 'Radhika Apte'],
        featured: true
      },
      {
        title: 'Laal Singh Chaddha',
        description: 'Indian adaptation of Forrest Gump.',
        genre: 'Drama',
        duration: 159,
        language: 'Hindi',
        rating: 'U',
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=300',
        price: 270,
        total_seats: 125,
        director: 'Advait Chandan',
        cast: ['Aamir Khan', 'Kareena Kapoor', 'Mona Singh'],
        featured: false
      },
      {
        title: 'Rocketry: The Nambi Effect',
        description: 'Biographical drama about Nambi Narayanan.',
        genre: 'Biography',
        duration: 157,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300',
        price: 250,
        total_seats: 110,
        director: 'R. Madhavan',
        cast: ['R. Madhavan', 'Simran', 'Rajit Kapur'],
        featured: false
      },
      {
        title: 'Shamshera',
        description: 'A dacoit tribe fights for their rights and independence.',
        genre: 'Action',
        duration: 158,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300',
        price: 290,
        total_seats: 135,
        director: 'Karan Malhotra',
        cast: ['Ranbir Kapoor', 'Vaani Kapoor', 'Sanjay Dutt'],
        featured: false
      },
      {
        title: 'Liger',
        description: 'A mixed martial arts fighter rises to fame.',
        genre: 'Action',
        duration: 140,
        language: 'Telugu',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=300',
        price: 310,
        total_seats: 140,
        director: 'Puri Jagannadh',
        cast: ['Vijay Deverakonda', 'Ananya Panday', 'Mike Tyson'],
        featured: false
      },
      {
        title: 'Cirkus',
        description: 'A comedy of errors with mistaken identities.',
        genre: 'Comedy',
        duration: 138,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=300',
        price: 240,
        total_seats: 105,
        director: 'Rohit Shetty',
        cast: ['Ranveer Singh', 'Pooja Hegde', 'Varun Sharma'],
        featured: false
      }
    ];

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1); // Start from tomorrow
    
    const movies = [];
    for (const template of movieTemplates) {
      // Select 2-3 random theaters for each movie
      const selectedTheaters = theaters
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 2) + 2);
      
      const showtimes = generateShowtimes(baseDate, selectedTheaters, template.price);
      
      const movie = await Movie.create({
        ...template,
        theater: selectedTheaters[0].name, // Legacy field
        theater_address: selectedTheaters[0].address, // Legacy field
        show_date: baseDate, // Legacy field
        show_time: '10:00 AM', // Legacy field
        available_seats: Math.floor(template.total_seats * 0.7 + Math.random() * 0.2 * template.total_seats),
        status: 'active',
        showtimes: showtimes // New dynamic showtimes
      });
      
      movies.push(movie);
    }
    console.log(`✅ Created ${movies.length} movies with dynamic showtimes`);

    // Create ShowInstances from movie.showtimes
    console.log('🎬 Creating show instances from movie showtimes...');
    const createdInstances = new Set(); // Track created instances to prevent duplicates
    
    for (const movie of movies) {
      if (movie.showtimes && movie.showtimes.length > 0) {
        for (const showtime of movie.showtimes) {
          const showDate = new Date(showtime.date);
          // Skip past dates
          if (showDate < new Date()) continue;
          
          if (showtime.timeslots && showtime.timeslots.length > 0) {
            // Create one ShowInstance per timeslot
            for (const slot of showtime.timeslots) {
              // Normalize date to start of day for comparison
              const normalizedDate = new Date(showDate);
              normalizedDate.setHours(0, 0, 0, 0);
              
              // Create unique key for this instance
              const instanceKey = `${movie._id}_${normalizedDate.toISOString()}_${slot.time}_${showtime.theatre}`;
              
              // Skip if we've already processed this combination
              if (createdInstances.has(instanceKey)) {
                continue;
              }
              
              // Check if ShowInstance already exists in database
              const existing = await ShowInstance.findOne({
                movie_id: movie._id,
                date: normalizedDate,
                time: slot.time,
                theatre: showtime.theatre
              });
              
              if (!existing) {
                try {
                  const showInstance = await ShowInstance.create({
                    movie_id: movie._id,
                    theatre: showtime.theatre,
                    theatre_address: showtime.theatre_address || '',
                    date: normalizedDate, // Use normalized date
                    time: slot.time,
                    location: showtime.location || '',
                    base_price: slot.price || movie.price || 200,
                    total_seats: movie.total_seats || 100,
                    available_seats: movie.available_seats || movie.total_seats || 100,
                    status: 'active'
                  });
                  
                  // Mark as created
                  createdInstances.add(instanceKey);
                  
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

                      await Seat.create({
                        item_type: 'show',
                        item_id: showInstance._id,
                        seat_number: seatNumber,
                        row: row,
                        column: col,
                        seat_type: seatType,
                        price: price,
                        status: 'available'
                      });
                    }
                  }
                } catch (err) {
                  // If duplicate key error, skip (already exists)
                  if (err.code === 11000) {
                    console.log(`⚠️  Skipping duplicate show instance: ${instanceKey}`);
                    continue;
                  }
                  throw err;
                }
              }
            }
          }
        }
      }
    }
    console.log('✅ Created show instances and seats for all movies');

    // Generate legacy seats for all movies (for backward compatibility)
    console.log('🎫 Generating legacy seats for movies...');
    for (const movie of movies) {
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      const seatsPerRow = Math.ceil(movie.total_seats / rows.length);
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        for (let col = 1; col <= seatsPerRow; col++) {
          const seatNumber = `${row}${col}`;
          if ((rowIndex * seatsPerRow + col) > movie.total_seats) break;
          
          let seatType = 'regular';
          let price = movie.price;
          
          if (row === 'A' || row === 'B') {
            seatType = 'vip';
            price = Math.round(movie.price * 1.5);
          } else if (row === 'C' || row === 'D') {
            seatType = 'premium';
            price = Math.round(movie.price * 1.2);
          }

          await Seat.create({
            item_type: 'movie',
            item_id: movie._id,
            seat_number: seatNumber,
            row: row,
            column: col,
            seat_type: seatType,
            price: price,
            status: 'available'
          });
        }
      }
    }
    console.log('✅ Generated seats for all movies');

    // ============================================
    // BUSES (20+)
    // ============================================
    console.log('🚌 Creating buses...');
    
    const busRoutes = [
      { from: 'Mumbai', to: 'Pune', price: 800, duration: '6 hours' },
      { from: 'Mumbai', to: 'Goa', price: 1200, duration: '12 hours' },
      { from: 'Mumbai', to: 'Delhi', price: 1500, duration: '18 hours' },
      { from: 'Mumbai', to: 'Bangalore', price: 1400, duration: '16 hours' },
      { from: 'Delhi', to: 'Jaipur', price: 900, duration: '7 hours' },
      { from: 'Delhi', to: 'Agra', price: 600, duration: '4 hours' },
      { from: 'Delhi', to: 'Chandigarh', price: 800, duration: '5 hours' },
      { from: 'Bangalore', to: 'Chennai', price: 1000, duration: '8 hours' },
      { from: 'Bangalore', to: 'Hyderabad', price: 1100, duration: '9 hours' },
      { from: 'Bangalore', to: 'Mysore', price: 500, duration: '3 hours' },
      { from: 'Chennai', to: 'Pondicherry', price: 700, duration: '4 hours' },
      { from: 'Chennai', to: 'Coimbatore', price: 800, duration: '6 hours' },
      { from: 'Hyderabad', to: 'Vijayawada', price: 900, duration: '7 hours' },
      { from: 'Pune', to: 'Nashik', price: 600, duration: '4 hours' },
      { from: 'Pune', to: 'Kolhapur', price: 700, duration: '5 hours' },
      { from: 'Kolkata', to: 'Digha', price: 800, duration: '6 hours' },
      { from: 'Kolkata', to: 'Darjeeling', price: 1200, duration: '10 hours' },
      { from: 'Ahmedabad', to: 'Surat', price: 500, duration: '3 hours' },
      { from: 'Ahmedabad', to: 'Vadodara', price: 400, duration: '2 hours' },
      { from: 'Jaipur', to: 'Udaipur', price: 700, duration: '5 hours' },
      { from: 'Jaipur', to: 'Jodhpur', price: 800, duration: '6 hours' },
      { from: 'Goa', to: 'Mangalore', price: 900, duration: '7 hours' }
    ];

    const operators = [
      'Volvo Bus Service', 'Neeta Travels', 'RedBus', 'SRS Travels',
      'KPN Travels', 'Orange Travels', 'IntrCity SmartBus', 'VRL Travels',
      'Kallada Travels', 'Sugama Tourist', 'KSRTC', 'MSRTC'
    ];

    const buses = [];
    for (let i = 0; i < 22; i++) {
      const route = busRoutes[i % busRoutes.length];
      const operator = operators[Math.floor(Math.random() * operators.length)];
      const busTypes = ['ac_sleeper', 'ac_seater', 'non_ac_sleeper', 'non_ac_seater'];
      const busType = busTypes[Math.floor(Math.random() * busTypes.length)];
      
      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + Math.floor(Math.random() * 7) + 1);
      
      const hours = [20, 21, 22, 23];
      const departureHour = hours[Math.floor(Math.random() * hours.length)];
      const departureTime = `${departureHour.toString().padStart(2, '0')}:00`;
      
      const arrivalHour = (departureHour + parseInt(route.duration.split(' ')[0])) % 24;
      const arrivalTime = `${arrivalHour.toString().padStart(2, '0')}:00`;
      
      const totalSeats = busType.includes('sleeper') ? [40, 42, 44][Math.floor(Math.random() * 3)] : [36, 38, 40][Math.floor(Math.random() * 3)];
      const availableSeats = Math.floor(totalSeats * (0.6 + Math.random() * 0.3));
      
      const bus = await Bus.create({
        operator,
        bus_number: `${route.from.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 9000 + 1000)}`,
        bus_type: busType,
        from_city: route.from,
        to_city: route.to,
        route: `${route.from} → ${route.to}`,
        departure_date: departureDate,
        departure_time: departureTime,
        arrival_time: arrivalTime,
        duration: route.duration,
        total_seats: totalSeats,
        available_seats: availableSeats,
        price: route.price + Math.floor(Math.random() * 200 - 100),
        amenities: ['WiFi', 'Charging Port', 'Blanket', 'Water Bottle', 'Snacks'].slice(0, Math.floor(Math.random() * 3) + 3),
        status: 'active',
        boarding_point: `${route.from} Bus Stand`,
        dropping_point: `${route.to} Bus Stand`,
        bus_layout: busType.includes('sleeper') ? 'sleeper' : '2x2',
        ratings: {
          average: 3.8 + Math.random() * 0.5,
          count: Math.floor(Math.random() * 200 + 50)
        }
      });
      
      buses.push(bus);
    }
    console.log(`✅ Created ${buses.length} buses`);

    // Generate seats for buses
    console.log('🎫 Generating seats for buses...');
    for (const bus of buses) {
      const totalSeats = bus.total_seats;
      const rows = Math.ceil(totalSeats / 4);
      const isSleeper = bus.bus_type.includes('sleeper');
      
      for (let row = 1; row <= rows; row++) {
        const rowLetter = String.fromCharCode(64 + row);
        for (let col = 1; col <= 4; col++) {
          const seatNumber = (row - 1) * 4 + col;
          if (seatNumber > totalSeats) break;

          let seatType = 'regular';
          if (isSleeper) {
            seatType = 'sleeper';
          } else {
            seatType = col === 1 || col === 4 ? 'window' : 'aisle';
          }

          await Seat.create({
            item_type: 'bus',
            item_id: bus._id,
            seat_number: seatNumber.toString(),
            row: rowLetter,
            column: col,
            seat_type: seatType,
            price: bus.price,
            status: 'available'
          });
        }
      }
    }
    console.log('✅ Generated seats for all buses');

    // ============================================
    // EVENTS (20+)
    // ============================================
    console.log('🎪 Creating events...');
    
    const eventTemplates = [
      { title: 'Sunburn Festival 2024', category: 'festival', price: 2500, city: 'Goa', venue: 'Vagator Beach' },
      { title: 'Comedy Night with Zakir Khan', category: 'comedy', price: 1500, city: 'Mumbai', venue: 'Jio World Garden' },
      { title: 'Mumbai Marathon 2024', category: 'sports', price: 500, city: 'Mumbai', venue: 'Marine Drive' },
      { title: 'EDM Night - DJ Snake', category: 'music', price: 2000, city: 'Mumbai', venue: 'Hard Rock Cafe' },
      { title: 'Standup Comedy - Anubhav Singh Bassi', category: 'comedy', price: 1200, city: 'Delhi', venue: 'Comedy Store' },
      { title: 'Rock Concert - Indian Ocean', category: 'music', price: 1800, city: 'Bangalore', venue: 'UB City' },
      { title: 'Food Festival - Taste of India', category: 'food', price: 800, city: 'Mumbai', venue: 'Bandra Kurla Complex' },
      { title: 'Tech Summit 2024', category: 'conference', price: 3000, city: 'Bangalore', venue: 'ITC Gardenia' },
      { title: 'Bollywood Night - Live Performance', category: 'music', price: 2200, city: 'Mumbai', venue: 'JW Marriott' },
      { title: 'Yoga & Wellness Retreat', category: 'wellness', price: 1500, city: 'Goa', venue: 'Beach Resort' },
      { title: 'Art Exhibition - Modern Masters', category: 'art', price: 500, city: 'Delhi', venue: 'National Gallery' },
      { title: 'Cricket Match - IPL 2024', category: 'sports', price: 3500, city: 'Mumbai', venue: 'Wankhede Stadium' },
      { title: 'Fashion Show - Lakme Fashion Week', category: 'fashion', price: 4000, city: 'Mumbai', venue: 'Jio World Convention Centre' },
      { title: 'Theatre Play - Hamlet', category: 'theatre', price: 1000, city: 'Mumbai', venue: 'Prithvi Theatre' },
      { title: 'Dance Performance - Kathak Recital', category: 'dance', price: 800, city: 'Delhi', venue: 'Kamani Auditorium' },
      { title: 'Wine & Dine Evening', category: 'food', price: 2500, city: 'Goa', venue: 'Beachside Restaurant' },
      { title: 'Photography Workshop', category: 'workshop', price: 2000, city: 'Mumbai', venue: 'Photography Studio' },
      { title: 'Jazz Night - Live Music', category: 'music', price: 1500, city: 'Bangalore', venue: 'Blue Frog' },
      { title: 'Poetry Slam', category: 'literature', price: 600, city: 'Delhi', venue: 'India Habitat Centre' },
      { title: 'Gaming Tournament - PUBG Mobile', category: 'gaming', price: 1000, city: 'Mumbai', venue: 'Gaming Arena' },
      { title: 'Magic Show - P.C. Sorcar Jr.', category: 'entertainment', price: 1800, city: 'Mumbai', venue: 'NCPA' },
      { title: 'Beer Festival', category: 'festival', price: 1200, city: 'Goa', venue: 'Beach Party Zone' }
    ];

    const events = [];
    for (const template of eventTemplates) {
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + Math.floor(Math.random() * 30) + 7);
      
      const eventTime = ['16:00', '18:00', '19:00', '19:30', '20:00'][Math.floor(Math.random() * 5)];
      const totalTickets = [500, 800, 1000, 2000, 5000][Math.floor(Math.random() * 5)];
      const availableTickets = Math.floor(totalTickets * (0.5 + Math.random() * 0.4));
      
      const event = await Event.create({
        title: template.title,
        description: `Join us for an amazing ${template.category} event at ${template.venue}, ${template.city}.`,
        category: template.category,
        venue: template.venue,
        city: template.city,
        address: `${template.venue}, ${template.city}`,
        event_date: eventDate,
        event_time: eventTime,
        duration: ['2 hours', '3 hours', '4 hours', '6 hours', '8 hours'][Math.floor(Math.random() * 5)],
        image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
        total_tickets: totalTickets,
        available_tickets: availableTickets,
        price: template.price + Math.floor(Math.random() * 500 - 250),
        organizer: ['Event Organizers Inc', 'Live Events Co', 'Entertainment Hub', 'Cultural Society'][Math.floor(Math.random() * 4)],
        organizer_contact: {
          email: 'info@events.com',
          phone: '1800-123-4567',
          website: 'https://events.com'
        },
        status: 'upcoming',
        event_type: ['indoor', 'outdoor'][Math.floor(Math.random() * 2)],
        age_restriction: ['16+', '18+', 'All Ages'][Math.floor(Math.random() * 3)],
        tags: [template.category, 'Entertainment', 'Live'],
        featured: Math.random() > 0.6
      });
      
      events.push(event);
    }
    console.log(`✅ Created ${events.length} events`);

    // ============================================
    // TOURS (20+)
    // ============================================
    console.log('🏔️ Creating tours...');
    
    const tourTemplates = [
      { title: 'Ladakh Bike Adventure', destination: 'Ladakh', duration: '10 Days 9 Nights', price: 35000, type: 'adventure', difficulty: 'challenging' },
      { title: 'Kerala Backwaters Tour', destination: 'Kerala', duration: '5 Days 4 Nights', price: 15000, type: 'leisure', difficulty: 'easy' },
      { title: 'Goa Beach Paradise', destination: 'Goa', duration: '4 Days 3 Nights', price: 12000, type: 'leisure', difficulty: 'easy' },
      { title: 'Rajasthan Heritage Tour', destination: 'Rajasthan', duration: '7 Days 6 Nights', price: 25000, type: 'cultural', difficulty: 'moderate' },
      { title: 'Himalayan Trekking Expedition', destination: 'Himachal Pradesh', duration: '8 Days 7 Nights', price: 28000, type: 'adventure', difficulty: 'challenging' },
      { title: 'Kashmir Valley Tour', destination: 'Kashmir', duration: '6 Days 5 Nights', price: 22000, type: 'leisure', difficulty: 'easy' },
      { title: 'Varanasi Spiritual Journey', destination: 'Varanasi', duration: '3 Days 2 Nights', price: 8000, type: 'spiritual', difficulty: 'easy' },
      { title: 'Rishikesh Adventure Camp', destination: 'Rishikesh', duration: '4 Days 3 Nights', price: 10000, type: 'adventure', difficulty: 'moderate' },
      { title: 'Darjeeling Tea Estate Tour', destination: 'Darjeeling', duration: '5 Days 4 Nights', price: 18000, type: 'leisure', difficulty: 'easy' },
      { title: 'Andaman Island Hopping', destination: 'Andaman', duration: '7 Days 6 Nights', price: 32000, type: 'leisure', difficulty: 'easy' },
      { title: 'Spiti Valley Road Trip', destination: 'Spiti Valley', duration: '9 Days 8 Nights', price: 30000, type: 'adventure', difficulty: 'challenging' },
      { title: 'Mysore & Coorg Tour', destination: 'Karnataka', duration: '5 Days 4 Nights', price: 16000, type: 'leisure', difficulty: 'easy' },
      { title: 'Golden Triangle Tour', destination: 'Delhi-Agra-Jaipur', duration: '6 Days 5 Nights', price: 20000, type: 'cultural', difficulty: 'moderate' },
      { title: 'Munnar Hill Station', destination: 'Munnar', duration: '4 Days 3 Nights', price: 14000, type: 'leisure', difficulty: 'easy' },
      { title: 'Udaipur City Palace Tour', destination: 'Udaipur', duration: '3 Days 2 Nights', price: 12000, type: 'cultural', difficulty: 'easy' },
      { title: 'Manali Snow Adventure', destination: 'Manali', duration: '5 Days 4 Nights', price: 18000, type: 'adventure', difficulty: 'moderate' },
      { title: 'Pondicherry French Colony', destination: 'Pondicherry', duration: '3 Days 2 Nights', price: 10000, type: 'cultural', difficulty: 'easy' },
      { title: 'Ooty Nilgiri Hills', destination: 'Ooty', duration: '4 Days 3 Nights', price: 13000, type: 'leisure', difficulty: 'easy' },
      { title: 'Jim Corbett Safari', destination: 'Jim Corbett', duration: '3 Days 2 Nights', price: 15000, type: 'adventure', difficulty: 'moderate' },
      { title: 'Hampi Heritage Walk', destination: 'Hampi', duration: '4 Days 3 Nights', price: 11000, type: 'cultural', difficulty: 'moderate' },
      { title: 'Leh-Ladakh Road Trip', destination: 'Leh', duration: '12 Days 11 Nights', price: 40000, type: 'adventure', difficulty: 'challenging' },
      { title: 'Shimla-Kullu-Manali', destination: 'Himachal Pradesh', duration: '6 Days 5 Nights', price: 20000, type: 'leisure', difficulty: 'moderate' }
    ];

    const tourOperators = [
      'Ladakh Bike Tours', 'Kerala Tourism', 'Goa Adventures', 'Rajasthan Travels',
      'Himalayan Expeditions', 'Kashmir Tours', 'Spiritual Journeys', 'Adventure Zone',
      'Heritage Walks', 'Island Explorers', 'Mountain Treks', 'Cultural Tours'
    ];

    const tours = [];
    for (const template of tourTemplates) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 30) + 14);
      
      const days = parseInt(template.duration.split(' ')[0]);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days);
      
      const maxCapacity = [10, 15, 20, 25][Math.floor(Math.random() * 4)];
      const availableSlots = Math.floor(maxCapacity * (0.4 + Math.random() * 0.4));
      
      const tour = await Tour.create({
        title: template.title,
        description: `Experience the beauty of ${template.destination} with our carefully curated ${template.type} tour.`,
        destination: template.destination,
        duration: template.duration,
        start_date: startDate,
        end_date: endDate,
        image_url: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=400',
        price_per_person: template.price + Math.floor(Math.random() * 5000 - 2500),
        max_capacity: maxCapacity,
        available_slots: availableSlots,
        difficulty_level: template.difficulty,
        tour_operator: tourOperators[Math.floor(Math.random() * tourOperators.length)],
        status: 'available',
        tour_type: template.type,
        featured: Math.random() > 0.6,
        inclusions: ['Accommodation', 'Meals', 'Transport', 'Guide'],
        exclusions: ['Personal Expenses', 'Travel Insurance']
      });
      
      tours.push(tour);
    }
    console.log(`✅ Created ${tours.length} tours`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin: admin@tickethub.com / admin123');
    console.log('   User:  john@example.com / password123');
    console.log(`\n📊 Created:`);
    console.log(`   - ${movies.length} Movies (with dynamic showtimes)`);
    console.log(`   - ${buses.length} Buses`);
    console.log(`   - ${events.length} Events`);
    console.log(`   - ${tours.length} Tours`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();
