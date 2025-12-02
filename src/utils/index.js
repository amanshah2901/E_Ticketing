export const createPageUrl = (pageName) => {
  const routes = {
    Home: '/',
    Search: '/search',
    MovieBooking: '/movie-booking',
    BusBooking: '/bus-booking',
    EventBooking: '/event-booking',
    TourBooking: '/tour-booking',
    Payment: '/payment',
    Confirmation: '/confirmation',
    MyBookings: '/my-bookings',
    AdminDashboard: '/admin',
    Profile: '/profile',
    Login: '/login',
    Register: '/register'
  }
  
  return routes[pageName] || '/'
}

export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export const formatDate = (dateString, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  
  return new Date(dateString).toLocaleDateString('en-IN', { ...defaultOptions, ...options })
}

export const formatTime = (timeString) => {
  return timeString
}

export const generateBookingReference = () => {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substr(2, 9).toUpperCase()
  return `BK${timestamp}${random}`
}

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePhone = (phone) => {
  const re = /^[0-9]{10}$/
  return re.test(phone)
}

export const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

export const getSeatTypeColor = (seatType) => {
  const colors = {
    regular: 'bg-white border-gray-300',
    premium: 'bg-amber-100 border-amber-400',
    vip: 'bg-purple-100 border-purple-400',
    sleeper: 'bg-blue-100 border-blue-400',
    window: 'bg-green-100 border-green-400',
    aisle: 'bg-orange-100 border-orange-400'
  }
  
  return colors[seatType] || colors.regular
}

export const getBookingStatusColor = (status) => {
  const colors = {
    confirmed: 'bg-green-100 text-green-700 border-green-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200'
  }
  
  return colors[status] || colors.pending
}

export const calculateTotalAmount = (basePrice, quantity, taxPercentage = 10, bookingFeePercentage = 5) => {
  const subtotal = basePrice * quantity
  const bookingFee = subtotal * (bookingFeePercentage / 100)
  const tax = (subtotal + bookingFee) * (taxPercentage / 100)
  return subtotal + bookingFee + tax
}