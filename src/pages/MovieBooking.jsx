// src/pages/MovieBooking.jsx
import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import SeatMap from '@/components/booking/SeatMap'
import BookingSummary from '@/components/booking/BookingSummary'
import { moviesAPI } from '@/api/services'
import { formatCurrency, formatDate } from '@/utils'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Film,
  Star,
  Armchair,
  Info
} from 'lucide-react'

const MovieBooking = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [movie, setMovie] = useState(null)
  const [seats, setSeats] = useState({}) // normalized -> { A: [...], B: [...] }
  const [selectedSeats, setSelectedSeats] = useState([])
  const [viewerDetails, setviewerDetails] = useState([{ name: '', age: '', gender: '' }])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1) // 1: Select Seats, 2: viewer Details, 3: Review

  const movieId = searchParams.get('id')

  useEffect(() => {
    // redirect to login if not authenticated
    if (!user) {
      navigate('/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return
    }
    if (!movieId) {
      setLoading(false)
      setMovie(null)
      return
    }

    fetchMovieDetails()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId, user])

  const normalizeSeats = (rawSeats) => {
    // handle multiple possible formats:
    // 1) object keyed by row: { A: [...], B: [...] } -> return as-is
    // 2) nested { seats: { A: [...], ... }, movie: {...} } -> return seats
    // 3) flat array: [ { row: 'A', column: 1, ... }, ... ] -> group by row
    if (!rawSeats) return {}

    // if response has seats property
    if (rawSeats.seats && typeof rawSeats.seats === 'object' && !Array.isArray(rawSeats.seats)) {
      return rawSeats.seats
    }

    // if rawSeats is object keyed by row (and values are arrays)
    if (typeof rawSeats === 'object' && !Array.isArray(rawSeats)) {
      const keys = Object.keys(rawSeats)
      const allArrays = keys.length > 0 && keys.every(k => Array.isArray(rawSeats[k]))
      if (allArrays) {
        return rawSeats
      }
      // maybe the API returns { data: { seats: ... } } or similar - try nested
      if (rawSeats.data && rawSeats.data.seats && typeof rawSeats.data.seats === 'object') {
        return rawSeats.data.seats
      }
    }

    // if flat array of seats
    if (Array.isArray(rawSeats)) {
      const grouped = {}
      rawSeats.forEach((s) => {
        const row = s.row || (s.seat_number ? s.seat_number.charAt(0) : 'A')
        if (!grouped[row]) grouped[row] = []
        grouped[row].push(s)
      })
      // Sort seats within each row by column (if present)
      Object.keys(grouped).forEach(r => {
        grouped[r].sort((a, b) => (a.column || 0) - (b.column || 0))
      })
      return grouped
    }

    // fallback
    return {}
  }

  const fetchMovieDetails = async () => {
    setLoading(true)
    try {
      // Use Promise.all so both requests are done concurrently
      const [movieResp, seatsResp] = await Promise.allSettled([
        moviesAPI.getMovieById(movieId),
        moviesAPI.getMovieSeats(movieId)
      ])

      // normalize movie
      let movieData = null
      if (movieResp.status === 'fulfilled') {
        // moviesAPI returns res.data.data according to your service
        const mv = movieResp.value
        // movie might be under mv.movie or mv (depending on backend)
        movieData = mv?.movie ?? mv
      }

      // normalize seats
      let seatsDataRaw = null
      if (seatsResp.status === 'fulfilled') {
        seatsDataRaw = seatsResp.value
      }

      // If seatsResp contains { movie, seats, seat_layout } structure (as in your preview),
      // moviesAPI.getMovieSeats returns res.data.data already, so seatsDataRaw may equal that.
      // Normalize robustly:
      const normalizedSeats = normalizeSeats(seatsDataRaw)

      // console logs for debugging (remove in production)
      // eslint-disable-next-line no-console
      console.log('Movie API result:', movieResp, 'Parsed movie:', movieData)
      // eslint-disable-next-line no-console
      console.log('Seats raw:', seatsDataRaw, 'Normalized seats:', normalizedSeats)

      setMovie(movieData ?? null)
      setSeats(normalizedSeats)
    } catch (error) {
      console.error('Error fetching movie or seats:', error)
      setMovie(null)
      setSeats({})
    } finally {
      setLoading(false)
    }
  }

  const handleSeatSelect = (selected) => {
    setSelectedSeats(selected)
    // Auto adjust viewer details length to match selected seats
    if (selected.length > viewerDetails.length) {
      const newDetails = [...viewerDetails]
      while (newDetails.length < selected.length) newDetails.push({ name: '', age: '', gender: '' })
      setviewerDetails(newDetails)
    } else if (selected.length < viewerDetails.length) {
      setviewerDetails(viewerDetails.slice(0, selected.length))
    }
  }

  const updateviewerDetail = (index, field, value) => {
    const newDetails = [...viewerDetails]
    newDetails[index] = { ...newDetails[index], [field]: value }
    setviewerDetails(newDetails)
  }

  const calculateTotal = () => {
    if (!movie || selectedSeats.length === 0) return 0

    const seatPrices = selectedSeats.map(seatNumber => {
      // find seat across rows
      const seat = Object.values(seats).flat().find(s => s.seat_number === seatNumber || s.seat_number === String(seatNumber))
      return seat?.price ?? movie.price ?? 0
    })

    const subtotal = seatPrices.reduce((sum, p) => sum + (p || 0), 0)
    const bookingFee = subtotal * 0.05
    const tax = (subtotal + bookingFee) * 0.05

    return subtotal + bookingFee + tax
  }

  const handleContinue = () => {
    if (step === 1 && selectedSeats.length === 0) {
      alert('Please select at least one seat')
      return
    }

    if (step === 2) {
      for (let i = 0; i < viewerDetails.length; i++) {
        const p = viewerDetails[i]
        if (!p.name || !p.age || !p.gender) {
          alert(`Please fill all details for viewer ${i + 1}`)
          return
        }
        if (Number(p.age) < 1 || Number(p.age) > 120) {
          alert(`Please enter a valid age for viewer ${i + 1}`)
          return
        }
      }
    }

    if (step === 3) {
      // prepare booking payload and navigate to payment
      const bookingData = {
        booking_type: 'movie',
        item_id: movieId,
        quantity: selectedSeats.length,
        seats: selectedSeats,
        viewer_details: viewerDetails,
        total_amount: calculateTotal(),
        item: movie,
        basePrice: movie?.price ?? 0,
        eventDate: movie?.show_date,
        eventTime: movie?.show_time,
        venue: `${movie?.theater ?? ''}${movie?.theater_address ? ', ' + movie.theater_address : ''}`
      }
      navigate('/payment', { state: { bookingData } })
      return
    }

    setStep(s => s + 1)
  }

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading movie details...</p>
        </div>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Movie not found</h1>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  // derive layout if needed
  const rows = Object.keys(seats || {})
  const seatsPerRow = rows.length > 0 ? (seats[rows[0]]?.length ?? 0) : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= stepNumber ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                } font-semibold`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-24 h-1 ${step > stepNumber ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center mt-2 text-sm text-gray-600">
            <div className="w-32 text-center">Select Seats</div>
            <div className="w-32 text-center">viewer Details</div>
            <div className="w-32 text-center">Review & Pay</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Movie Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <img
                    src={movie.poster_url || movie.image_url || '/default-movie-poster.jpg'}
                    alt={movie.title || movie.name}
                    className="w-32 h-48 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h1 className="text-2xl font-bold mb-2">{movie.title || movie.name}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span>{movie.genre}</span>
                          <span>•</span>
                          <span>{movie.language}</span>
                          <span>•</span>
                          <span>{movie.duration} mins</span>
                          <span>•</span>
                          <Badge variant="outline">{movie.rating}</Badge>
                        </div>
                      </div>
                      {movie.imdb_rating && (
                        <Badge className="bg-yellow-500 text-white border-0">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          IMDb {movie.imdb_rating}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{movie.show_date ? formatDate(movie.show_date) : 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{movie.show_time || 'TBD'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{movie.theater || ''}</span>
                      </div>
                    </div>

                    {movie.description && (
                      <p className="mt-4 text-gray-600 line-clamp-3">{movie.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 1: Seat Selection */}
            {step === 1 && (
              <SeatMap
                seats={seats}
                layout={{ rows, seatsPerRow }}
                onSeatSelect={handleSeatSelect}
                selectedSeats={selectedSeats}
                maxSeats={10}
                type="movie"
              />
            )}

            {/* Step 2: viewer Details */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    viewer Details ({selectedSeats.length} {selectedSeats.length === 1 ? 'viewer' : 'viewers'})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {viewerDetails.map((viewer, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border rounded-lg bg-white"
                      >
                        <h3 className="font-semibold mb-4">viewer {index + 1} - Seat {selectedSeats[index]}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                            <Input
                              value={viewer.name}
                              onChange={(e) => updateviewerDetail(index, 'name', e.target.value)}
                              placeholder="Enter full name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                            <Input
                              type="number"
                              value={viewer.age}
                              onChange={(e) => updateviewerDetail(index, 'age', e.target.value)}
                              placeholder="Age"
                              min="1"
                              max="120"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                            <select
                              value={viewer.gender}
                              onChange={(e) => updateviewerDetail(index, 'gender', e.target.value)}
                              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            >
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Your Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Selected Seats</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedSeats.map(seat => (
                          <Badge key={seat} variant="default" className="bg-green-500 text-white">
                            {seat}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">viewer Details</h4>
                      <div className="space-y-3">
                        {viewerDetails.map((p, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium">viewer {i + 1} - {selectedSeats[i]}</div>
                            <div className="text-sm text-gray-600">
                              {p.name}, {p.age} years, {p.gender}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="space-y-6">
            <BookingSummary
              bookingData={{
                item: movie,
                selectedSeats,
                quantity: selectedSeats.length,
                viewerDetails,
                totalAmount: calculateTotal(),
                basePrice: movie.price,
                eventDate: movie.show_date,
                eventTime: movie.show_time,
                venue: `${movie.theater}${movie.theater_address ? ', ' + movie.theater_address : ''}`
              }}
              type="movie"
              showActions={false}
            />

            {/* Navigation Buttons */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span className="text-green-600">{formatCurrency(calculateTotal())}</span>
                  </div>

                  <Separator />

                  <div className="flex gap-3">
                    {step > 1 && (
                      <Button variant="outline" onClick={handleBack} className="flex-1">Back</Button>
                    )}
                    <Button
                      onClick={handleContinue}
                      disabled={
                        (step === 1 && selectedSeats.length === 0) ||
                        (step === 2 && viewerDetails.some(p => !p.name || !p.age || !p.gender))
                      }
                      className="flex-1"
                    >
                      {step === 3 ? 'Proceed to Payment' : 'Continue'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Important Information</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Please arrive at least 30 minutes before showtime</li>
                  <li>• Carry a valid ID proof for verification</li>
                  <li>• Tickets are non-refundable</li>
                  <li>• Children under 3 years are free</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MovieBooking
