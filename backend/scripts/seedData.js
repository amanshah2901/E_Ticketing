import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Movie from '../models/Movie.js';
import Bus from '../models/Bus.js';
import Event from '../models/Event.js';
import Tour from '../models/Tour.js';
import Seat from '../models/Seat.js';

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Movie.deleteMany({});
    await Bus.deleteMany({});
    await Event.deleteMany({});
    await Tour.deleteMany({});
    await Seat.deleteMany({});

    console.log('Cleared existing data');

    // Create admin user
    const adminUser = await User.create({
      full_name: 'Admin User',
      email: 'admin@tickethub.com',
      password: 'admin123',
      role: 'admin',
      phone: '9876543210',
      email_verified: true
    });

    // Create regular user
    const regularUser = await User.create({
      full_name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '9876543211',
      email_verified: true
    });

    console.log('Created users');

    // Create sample movies
    const movies = await Movie.create([
      {
        title: 'Avatar: The Way of Water',
        description: 'Jake Sully lives with his newfound family formed on the planet of Pandora.',
        genre: 'Sci-Fi',
        duration: 192,
        language: 'English',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=300',
        theater: 'PVR Cinemas',
        theater_address: 'Phoenix Marketcity, Mumbai',
        show_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        show_time: '18:30',
        total_seats: 100,
        available_seats: 85,
        price: 350,
        status: 'active',
        featured: true,
        director: 'James Cameron',
        cast: ['Sam Worthington', 'Zoe Saldana', 'Sigourney Weaver']
      },
      {
        title: 'Pathaan',
        description: 'An Indian spy takes on the leader of a group of mercenaries.',
        genre: 'Action',
        duration: 146,
        language: 'Hindi',
        rating: 'UA',
        poster_url: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=300',
        theater: 'INOX',
        theater_address: 'R-City Mall, Mumbai',
        show_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        show_time: '21:00',
        total_seats: 120,
        available_seats: 95,
        price: 300,
        status: 'active',
        featured: true,
        director: 'Siddharth Anand',
        cast: ['Shah Rukh Khan', 'Deepika Padukone', 'John Abraham']
      }
    ]);

    console.log('Created movies');

    // Create sample buses
    const buses = await Bus.create([
      {
        operator: 'Volvo Bus Service',
        bus_number: 'MH01AB1234',
        bus_type: 'ac_sleeper',
        from_city: 'Mumbai',
        to_city: 'Pune',
        departure_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        departure_time: '22:00',
        arrival_time: '04:00',
        duration: '6 hours',
        total_seats: 40,
        available_seats: 35,
        price: 800,
        amenities: ['WiFi', 'Charging Port', 'Blanket', 'Water Bottle'],
        status: 'active',
        boarding_point: 'Dadar East',
        dropping_point: 'Pune Station',
        bus_layout: 'sleeper',
        ratings: {
          average: 4.2,
          count: 150
        }
      },
      {
        operator: 'Neeta Travels',
        bus_number: 'MH02CD5678',
        bus_type: 'ac_seater',
        from_city: 'Mumbai',
        to_city: 'Goa',
        departure_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        departure_time: '20:00',
        arrival_time: '08:00',
        duration: '12 hours',
        total_seats: 36,
        available_seats: 28,
        price: 1200,
        amenities: ['WiFi', 'Charging Port', 'Snacks'],
        status: 'active',
        boarding_point: 'Borivali West',
        dropping_point: 'Panjim Bus Stand',
        bus_layout: '2x2',
        ratings: {
          average: 4.0,
          count: 89
        }
      }
    ]);

    console.log('Created buses');

    // Create sample events
    const events = await Event.create([
      {
        title: 'Sunburn Festival 2024',
        description: 'Asia biggest electronic dance music festival featuring top international DJs.',
        category: 'festival',
        venue: 'Vagator Beach',
        city: 'Goa',
        address: 'Vagator Beach, North Goa',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        event_time: '16:00',
        duration: '8 hours',
        image_url: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400',
        total_tickets: 5000,
        available_tickets: 3500,
        price: 2500,
        organizer: 'Percept Live',
        organizer_contact: {
          email: 'info@sunburnfest.com',
          phone: '1800-123-4567',
          website: 'https://sunburnfest.com'
        },
        status: 'upcoming',
        event_type: 'outdoor',
        age_restriction: '18+',
        tags: ['EDM', 'Festival', 'Music'],
        featured: true
      },
      {
        title: 'Comedy Night with Zakir Khan',
        description: 'An evening of laughter with India favorite comedian Zakir Khan.',
        category: 'comedy',
        venue: 'Jio World Garden',
        city: 'Mumbai',
        address: 'Bandra Kurla Complex, Mumbai',
        event_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        event_time: '19:30',
        duration: '2 hours',
        image_url: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=400',
        total_tickets: 800,
        available_tickets: 450,
        price: 1500,
        organizer: 'Only Much Louder',
        organizer_contact: {
          email: 'bookings@oml.in',
          phone: '1800-987-6543'
        },
        status: 'upcoming',
        event_type: 'indoor',
        age_restriction: '16+',
        tags: ['Comedy', 'Standup', 'Entertainment'],
        featured: true
      }
    ]);

    console.log('Created events');

    // Create sample tours
    const tours = await Tour.create([
      {
        title: 'Ladakh Bike Adventure',
        description: 'An epic motorcycle tour through the breathtaking landscapes of Ladakh.',
        destination: 'Ladakh',
        duration: '10 Days 9 Nights',
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        end_date: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        image_url: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=400',
        gallery: [
          'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=400',
          'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400'
        ],
        inclusions: [
          'Royal Enfield Motorcycle',
          'Experienced Tour Guide',
          'All Meals',
          'Hotel Accommodation',
          'Backup Vehicle',
          'Oxygen Cylinders'
        ],
        exclusions: [
          'Personal Expenses',
          'Alcohol',
          'Travel Insurance'
        ],
        itinerary: [
          {
            day: 1,
            title: 'Arrival in Leh',
            description: 'Arrive at Leh airport and acclimatize to high altitude',
            meals: 'dinner'
          },
          {
            day: 2,
            title: 'Leh Local Sightseeing',
            description: 'Visit Leh Palace, Shanti Stupa, and local markets',
            meals: 'all'
          }
        ],
        price_per_person: 35000,
        max_capacity: 15,
        available_slots: 8,
        difficulty_level: 'challenging',
        tour_operator: 'Ladakh Bike Tours',
        operator_contact: {
          email: 'info@ladakhbiketours.com',
          phone: '9876543210'
        },
        status: 'available',
        tour_type: 'adventure',
        accommodation: 'hotel',
        transport: 'Royal Enfield Motorcycle',
        guide: true,
        meals: 'all',
        highlights: [
          'Khardung La Pass',
          'Pangong Lake',
          'Nubra Valley',
          'Magnetic Hill'
        ],
        requirements: [
          'Valid Driving License',
          'Basic Riding Experience',
          'Medical Fitness Certificate'
        ],
        featured: true
      }
    ]);

    console.log('Created tours');

    // Generate seats for movies and buses
    for (const movie of movies) {
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const seatsPerRow = Math.ceil(movie.total_seats / rows.length);
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        for (let col = 1; col <= seatsPerRow; col++) {
          const seatNumber = `${row}${col}`;
          let seatType = 'regular';
          let price = movie.price;
          
          if (row === 'A' || row === 'B') {
            seatType = 'vip';
            price = movie.price * 1.5;
          } else if (row === 'C' || row === 'D') {
            seatType = 'premium';
            price = movie.price * 1.2;
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

    console.log('Generated seats');

    console.log('✅ Database seeded successfully!');
    console.log('Admin Login: admin@tickethub.com / admin123');
    console.log('User Login: john@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedData();