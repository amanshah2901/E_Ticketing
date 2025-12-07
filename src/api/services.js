import api from './axios'

// Auth API
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }).then(res => {
      // Handle response structure: { data: { token, user } } or { token, user }
      const data = res.data.data || res.data;
      return {
        token: data.token,
        user: data.user
      };
    }),
  
  register: (userData) =>
    api.post('/auth/register', userData).then(res => res.data.data),
  
  getMe: () =>
    api.get('/auth/me').then(res => res.data.data),
  
  updateProfile: (userData) =>
    api.put('/auth/profile', userData).then(res => res.data.data),
  
  changePassword: (passwordData) =>
    api.put('/auth/change-password', passwordData).then(res => res.data)
}

// Movies API
export const moviesAPI = {
  getMovies: (params = {}) =>
    api.get('/movies', { params: { ...params, limit: params.limit || 100 } }).then(res => {
      // Handle response structure: { data: { movies: [...] } } or { movies: [...] }
      const data = res.data.data || res.data;
      // Return movies array or the full data object
      if (Array.isArray(data)) return data;
      if (data && data.movies) return data.movies;
      return data || [];
    }),
  
  getMovieById: (id) =>
    api.get(`/movies/${id}`).then(res => res.data.data),
  
  getMovieSeats: (movieId, showtimeId) =>
    api.get(`/movies/${movieId}/seats`, { params: { showtimeId } }).then(res => res.data.data),

  getFeaturedMovies: () =>
    api.get('/movies/featured').then(res => res.data.data),

  searchMovies: (search) =>
    api.get('/movies/api/search', { params: { search } }).then(res => res.data.data || res.data.movies || []),

  getMovieDetailsFromAPI: (imdbId) =>
    api.get(`/movies/api/details/${imdbId}`).then(res => res.data.data),

  getMovieShowtimes: (movieId, date) =>
    api.get(`/movies/${movieId}/showtimes`, { params: { date } }).then(res => {
      // Handle response structure: { data: { showtimes: {...} } } or { showtimes: {...} }
      const response = res.data?.data || res.data
      return response?.showtimes || response || {}
    }),

  getShowSeats: (showId) =>
    api.get(`/movies/show/${showId}/seats`).then(res => res.data.data),

  lockSeats: (showId, seatNumbers) =>
    api.post(`/movies/show/${showId}/seats/lock`, { seatNumbers }).then(res => res.data),

  unlockSeats: (showId, seatNumbers) =>
    api.post(`/movies/show/${showId}/seats/unlock`, { seatNumbers }).then(res => res.data),

  // Import latest movies from OMDB
  importLatestMovies: (options = {}) =>
    api.post('/movies/api/import-latest', options).then(res => res.data)

}

// Buses API
export const busesAPI = {
  getBuses: (params = {}) =>
    api.get('/buses', { params }).then(res => res.data.data.buses),
  
  getBusById: (id) =>
    api.get(`/buses/${id}`).then(res => res.data.data),
  
  getBusSeats: (busId) =>
    api.get(`/buses/${busId}/seats`).then(res => res.data.data),
  
  getPopularRoutes: () =>
    api.get('/buses/popular-routes').then(res => res.data.data),
  
  searchBuses: (params) =>
    api.get('/buses/search', { params }).then(res => res.data.data)
}

// Trains API
export const trainsAPI = {
  getTrains: (params = {}) =>
    api.get('/trains', { params }).then(res => res.data.data.trains || res.data.data),
  
  getTrainById: (id) =>
    api.get(`/trains/${id}`).then(res => res.data.data),
  
  getPopularRoutes: () =>
    api.get('/trains/popular-routes').then(res => res.data.data),
  
  searchTrains: (params) =>
    api.get('/trains/search', { params }).then(res => res.data.data)
}

// Flights API
export const flightsAPI = {
  getFlights: (params = {}) =>
    api.get('/flights', { params }).then(res => res.data.data.flights || res.data.data),
  
  getFlightById: (id) =>
    api.get(`/flights/${id}`).then(res => res.data.data),
  
  getPopularRoutes: () =>
    api.get('/flights/popular-routes').then(res => res.data.data),
  
  searchFlights: (params) =>
    api.get('/flights/search', { params }).then(res => res.data.data)
}

// Events API
export const eventsAPI = {
  getEvents: (params = {}) =>
    api.get('/events', { params }).then(res => res.data.data),
  
  getEventById: (id) =>
    api.get(`/events/${id}`).then(res => res.data.data),
  
  getFeaturedEvents: () =>
    api.get('/events/featured').then(res => res.data.data),
  
  getEventsByCategory: (category) =>
    api.get(`/events/category/${category}`).then(res => res.data.data),
  
  searchEvents: (params) =>
    api.get('/events/search', { params }).then(res => res.data.data)
}

// Tours API
export const toursAPI = {
  getTours: (params = {}) =>
    api.get('/tours', { params }).then(res => res.data.data),
  
  getTourById: (id) =>
    api.get(`/tours/${id}`).then(res => res.data.data),
  
  getFeaturedTours: () =>
    api.get('/tours/featured').then(res => res.data.data),
  
  getToursByDestination: (destination) =>
    api.get(`/tours/destination/${destination}`).then(res => res.data.data),
  
  searchTours: (params) =>
    api.get('/tours/search', { params }).then(res => res.data.data)
}

// Bookings API
export const bookingsAPI = {
  createBooking: (bookingData) =>
    api.post('/bookings', bookingData).then(res => res.data.data),
  
  getUserBookings: (params = {}) =>
    api.get('/bookings', { params }).then(res => res.data.data),
  
  getBookingById: (id) =>
    api.get(`/bookings/${id}`).then(res => res.data),
  
  cancelBooking: (id, reason) =>
    api.put(`/bookings/${id}/cancel`, { reason }).then(res => res.data.data),
  
  getBookingStats: () =>
    api.get('/bookings/stats').then(res => res.data.data),
  
  downloadTicket: (id) =>
    api.get(`/bookings/${id}/download`).then(res => res.data.data)
}

// Payments API
export const paymentsAPI = {
  createOrder: (orderData) =>
    api.post('/payments/create-order', orderData).then(res => res.data.data),
  
  verifyPayment: (paymentData) =>
    api.post('/payments/verify', paymentData).then(res => res.data),
  
  getPaymentMethods: () =>
    api.get('/payments/methods').then(res => res.data.data),
  
  getUserPayments: (params = {}) =>
    api.get('/payments', { params }).then(res => res.data.data)
}

// Wallet API
export const walletAPI = {
  getWallet: () =>
    api.get('/wallet').then(res => res.data.data),

  addFunds: (amount, paymentMethod) =>
    api
      .post('/wallet/add-funds', { amount, payment_method: paymentMethod })
      .then(res => res.data.data),

  getTransactions: (params = {}) =>
    api.get('/wallet/transactions', { params }).then(res => res.data.data),

  getWalletStats: () =>
    api.get('/wallet/stats').then(res => res.data.data),

  // ✅ FIXED: Correct response path
  createWalletOrder(amount) {
    return api
      .post('/wallet/create-order', { amount })
      .then(res => {
        // Handle different response structures
        const response = res.data;
        if (response.data?.order) {
          return response.data.order;
        }
        if (response.order) {
          return response.order;
        }
        console.error('Invalid order response:', response);
        throw new Error('Invalid order response from server');
      })
      .catch(error => {
        console.error('Wallet order creation error:', error);
        throw error;
      });
  },

  // Verify wallet payment with better error handling
  verifyWalletPayment(data) {
    return api.post('/wallet/verify-payment', data)
      .then(res => {
        // Handle both { success: true, data: {...} } and { success: true, ... } formats
        if (res.data.success) {
          return res.data;
        }
        return res.data;
      })
      .catch(error => {
        // Extract error message from response
        const errorMessage = error?.response?.data?.message || error?.message || "Payment verification failed";
        throw new Error(errorMessage);
      });
  },
  
  searchTransport: (params) =>
    api.get('/search/transport', { params })
      .then(res => {
        // Handle response structure: { success: true, data: { buses: [], trains: [], flights: [] } }
        if (res.data.success && res.data.data) {
          return res.data.data;
        }
        // Fallback if data is directly in response
        return res.data.data || res.data || { buses: [], trains: [], flights: [] };
      })
      .catch(error => {
        console.error('Transport search error:', error);
        return { buses: [], trains: [], flights: [] };
      })
};


// Admin API
export const adminAPI = {
  getDashboardStats: () =>
    api.get('/admin/dashboard').then(res => res.data.data),
  
  getAllUsers: (params = {}) =>
    api.get('/admin/users', { params }).then(res => res.data.data),
  
  getUserDetails: (userId) =>
    api.get(`/admin/users/${userId}`).then(res => res.data.data),
  
  updateUser: (userId, userData) =>
    api.put(`/admin/users/${userId}`, userData).then(res => res.data.data),
  
  getAllBookings: (params = {}) =>
    api.get('/admin/bookings', { params }).then(res => res.data.data),
  
  updateBooking: (bookingId, bookingData) =>
    api.put(`/admin/bookings/${bookingId}`, bookingData).then(res => res.data.data),
  
  getRevenueAnalytics: (params = {}) =>
    api.get('/admin/revenue-analytics', { params }).then(res => res.data.data)
}

// Movies API - Import latest from OMDB
moviesAPI.importLatestMovies = (options = {}) =>
  api.post('/movies/api/import-latest', options).then(res => res.data)

// Unified Search API
export const searchAPI = {
  unifiedSearch: (query) =>
    api.get('/search', { params: { query } }).then(res => res.data.data),
  
  searchTransport: (params) =>
    api.get('/search/transport', { params }).then(res => res.data.data)
}
