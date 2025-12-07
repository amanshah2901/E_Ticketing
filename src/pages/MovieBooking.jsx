// src/pages/MovieBooking.jsx
import React, { useState, useEffect, useMemo } from 'react'
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
import DatePicker from '@/components/movie/DatePicker'
import TimeSlotSelector from '@/components/movie/TimeSlotSelector'
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
  const [step, setStep] = useState(0) // 0: Select Date/Time, 1: Select Seats, 2: viewer Details, 3: Review
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedShowtime, setSelectedShowtime] = useState(null)
  const [showtimes, setShowtimes] = useState({})
  const [isLegacyMovie, setIsLegacyMovie] = useState(false) // Movies without showtimes array

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
      // Fetch movie details
      const movieResp = await moviesAPI.getMovieById(movieId)
      const movieData = movieResp?.movie ?? movieResp

      if (!movieData) {
        setMovie(null)
        return
      }

      setMovie(movieData)

      // Always fetch showtimes from API (handles both new and legacy)
      try {
        const showtimesResp = await moviesAPI.getMovieShowtimes(movieId)
        // Handle response structure: { showtimes: {...} } or direct showtimes object
        const showtimesData = showtimesResp?.showtimes || showtimesResp || {}
        setShowtimes(showtimesData)
        setIsLegacyMovie(false)
        
        // Auto-select first available date and showtime if none selected
        if (!selectedDate && Object.keys(showtimesData).length > 0) {
          const firstDate = Object.keys(showtimesData).sort()[0]
          if (firstDate) {
            setSelectedDate(firstDate)
            const firstTheatre = Object.keys(showtimesData[firstDate])[0]
            if (firstTheatre && showtimesData[firstDate][firstTheatre]?.shows?.length > 0) {
              setSelectedShowtime(showtimesData[firstDate][firstTheatre].shows[0])
            }
          }
        }
      } catch (err) {
        console.error('Error fetching showtimes:', err)
        // Fallback to legacy system
        const hasLegacyShow = movieData.show_date && movieData.show_time
        if (hasLegacyShow) {
        // Legacy system: create showtime structure from show_date/show_time
        // Allow user to select from available dates (show_date and next 7 days)
        const legacyDate = new Date(movieData.show_date).toISOString().split('T')[0]
        const legacyShowtimes = {}
        
        // Create showtimes for the original date and next 7 days
        for (let i = 0; i < 8; i++) {
          const date = new Date(movieData.show_date)
          date.setDate(date.getDate() + i)
          const dateKey = date.toISOString().split('T')[0]
          
          // Create multiple time slots for each date (morning, afternoon, evening, night)
          const timeSlots = [
            { time: '10:00 AM', base_price: movieData.price || 200 },
            { time: '1:30 PM', base_price: movieData.price || 200 },
            { time: '5:00 PM', base_price: movieData.price || 200 },
            { time: '8:30 PM', base_price: movieData.price || 200 }
          ]
          
          // Use original show_time for the original date
          if (i === 0) {
            timeSlots[0].time = movieData.show_time
          }
          
          legacyShowtimes[dateKey] = {
            [movieData.theater || 'Theater']: {
              theatre: movieData.theater || 'Theater',
              theatre_address: movieData.theater_address || '',
              location: movieData.theater_address || '',
              shows: timeSlots.map((slot, idx) => ({
                show_id: `legacy_${dateKey}_${idx}`,
                time: slot.time,
                base_price: slot.base_price,
                available_seats: movieData.available_seats || 0,
                total_seats: movieData.total_seats || 100
              }))
            }
          }
        }
        
          setShowtimes(legacyShowtimes)
          setIsLegacyMovie(true)
          // Auto-select legacy date and first showtime if none selected
          if (!selectedDate) {
            setSelectedDate(legacyDate)
            const firstShow = legacyShowtimes[legacyDate][movieData.theater || 'Theater'].shows[0]
            setSelectedShowtime(firstShow)
            // Auto-fetch seats for legacy movie
            setTimeout(() => {
              fetchSeatsForShowtime('legacy')
            }, 100)
          }
        } else {
          setShowtimes({})
          setIsLegacyMovie(false)
        }
      }
    } catch (error) {
      console.error('Error fetching movie:', error)
      setMovie(null)
      setShowtimes({})
    } finally {
      setLoading(false)
    }
  }

  const handleDateSelect = async (date) => {
    // Normalize date to YYYY-MM-DD format
    let dateStr = ''
    if (typeof date === 'string') {
      dateStr = date.split('T')[0]
    } else if (date instanceof Date) {
      dateStr = date.toISOString().split('T')[0]
    } else if (date) {
      const dateObj = new Date(date)
      if (!isNaN(dateObj.getTime())) {
        dateStr = dateObj.toISOString().split('T')[0]
      } else {
        dateStr = String(date).split('T')[0]
      }
    }
    
    setSelectedDate(dateStr || date)
    setSeats({}) // Clear seats when date changes
    setSelectedSeats([]) // Clear selected seats
    
    // IMPORTANT: Don't clear showtimes - they should persist
    // Only update selected showtime based on the new date
    if (dateStr && showtimes && Object.keys(showtimes).length > 0) {
      const dateShowtimes = showtimes[dateStr]
      if (dateShowtimes && Object.keys(dateShowtimes).length > 0) {
        const firstTheatre = Object.keys(dateShowtimes)[0]
        if (firstTheatre && dateShowtimes[firstTheatre]?.shows?.length > 0) {
          // Auto-select first showtime for the new date
          const firstShow = dateShowtimes[firstTheatre].shows[0]
          setSelectedShowtime(firstShow)
          // Auto-fetch seats for the new showtime
          setTimeout(() => {
            fetchSeatsForShowtime(firstShow.show_id)
          }, 100)
        } else {
          setSelectedShowtime(null)
        }
      } else {
        // No showtimes for this date - but keep showtimes state intact
        setSelectedShowtime(null)
      }
    } else {
      // No showtimes loaded yet - but don't clear showtimes state
      setSelectedShowtime(null)
    }
  }

  const handleShowtimeSelect = async (showtime) => {
    setSelectedShowtime(showtime)
    setSeats({}) // Clear previous seats
    setSelectedSeats([]) // Clear selected seats
    await fetchSeatsForShowtime(showtime.show_id)
  }

  const fetchSeatsForShowtime = async (showId) => {
    try {
      let seatsData = null
      
      if (showId === 'legacy' || showId?.startsWith('legacy_') || isLegacyMovie) {
        // For legacy movies, use the legacy seats endpoint
        const seatsResp = await moviesAPI.getMovieSeats(movieId)
        console.log('Legacy seats response:', seatsResp)
        // Handle different response structures
        if (seatsResp?.seats) {
          seatsData = seatsResp.seats
        } else if (seatsResp?.data?.seats) {
          seatsData = seatsResp.data.seats
        } else if (typeof seatsResp === 'object' && !Array.isArray(seatsResp)) {
          seatsData = seatsResp
        }
      } else {
        // For new system, use show-specific seats endpoint
        const seatsResp = await moviesAPI.getShowSeats(showId)
        console.log('Show seats response:', seatsResp)
        // Handle different response structures
        if (seatsResp?.seats) {
          seatsData = seatsResp.seats
        } else if (seatsResp?.data?.seats) {
          seatsData = seatsResp.data.seats
        } else if (typeof seatsResp === 'object' && !Array.isArray(seatsResp)) {
          seatsData = seatsResp
        }
      }
      
      if (seatsData) {
        const normalizedSeats = normalizeSeats(seatsData)
        console.log('Normalized seats:', normalizedSeats, 'Keys:', Object.keys(normalizedSeats))
        setSeats(normalizedSeats)
      } else {
        console.warn('No seats data received, generating mock seats')
        // Generate mock seats if none exist (for testing)
        const mockSeats = generateMockSeats()
        setSeats(mockSeats)
      }
    } catch (error) {
      console.error('Error fetching seats:', error)
      // Generate mock seats on error (for testing)
      const mockSeats = generateMockSeats()
      setSeats(mockSeats)
    }
  }

  // Generate mock seats for testing if API fails
  const generateMockSeats = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    const seatsPerRow = 10
    const mockSeats = {}
    
    rows.forEach((row, rowIdx) => {
      mockSeats[row] = []
      for (let col = 1; col <= seatsPerRow; col++) {
        let seatType = 'regular'
        let price = movie?.price || 200
        
        if (row === 'A' || row === 'B') {
          seatType = 'vip'
          price = Math.round(price * 1.5)
        } else if (row === 'C' || row === 'D') {
          seatType = 'premium'
          price = Math.round(price * 1.2)
        }
        
        mockSeats[row].push({
          seat_number: `${row}${col}`,
          row: row,
          column: col,
          status: Math.random() > 0.7 ? 'booked' : 'available',
          seat_type: seatType,
          price: price
        })
      }
    })
    
    return mockSeats
  }

  const handleSeatSelect = async (selected) => {
    const previousSeats = selectedSeats;
    setSelectedSeats(selected);
    
    // Auto adjust viewer details length to match selected seats
    if (selected.length > viewerDetails.length) {
      const newDetails = [...viewerDetails]
      while (newDetails.length < selected.length) newDetails.push({ name: '', age: '', gender: '' })
      setviewerDetails(newDetails)
    } else if (selected.length < viewerDetails.length) {
      setviewerDetails(viewerDetails.slice(0, selected.length))
    }

    // Lock/unlock seats
    if (selectedShowtime?.show_id && selectedShowtime.show_id !== 'legacy' && !selectedShowtime.show_id.startsWith('legacy_')) {
      try {
        // Unlock previously selected seats that are no longer selected
        const seatsToUnlock = previousSeats.filter(seat => !selected.includes(seat));
        if (seatsToUnlock.length > 0) {
          await moviesAPI.unlockSeats(selectedShowtime.show_id, seatsToUnlock);
        }

        // Lock newly selected seats
        const seatsToLock = selected.filter(seat => !previousSeats.includes(seat));
        if (seatsToLock.length > 0) {
          await moviesAPI.lockSeats(selectedShowtime.show_id, seatsToLock);
          // Refresh seats to show locked status
          await fetchSeatsForShowtime(selectedShowtime.show_id);
        }
      } catch (error) {
        console.error('Error locking/unlocking seats:', error);
        // Don't block the UI if locking fails, but show a warning
        if (error.response?.status === 400) {
          alert(error.response?.data?.message || 'Some seats may have been selected by another user. Please refresh and try again.');
          // Refresh seats
          await fetchSeatsForShowtime(selectedShowtime.show_id);
        }
      }
    }
  }

  const updateviewerDetail = (index, field, value) => {
    const newDetails = [...viewerDetails]
    newDetails[index] = { ...newDetails[index], [field]: value }
    setviewerDetails(newDetails)
  }

  const pricing = useMemo(() => {
    if (!movie || selectedSeats.length === 0) {
      return { subtotal: 0, bookingFee: 0, gst: 0, total: 0 }
    }

    const seatPrices = selectedSeats.map(seatNumber => {
      const seat = Object.values(seats).flat().find(
        s => s.seat_number === seatNumber || s.seat_number === String(seatNumber)
      )
      return seat?.price ?? selectedShowtime?.base_price ?? movie.price ?? 0
    })

    const subtotal = seatPrices.reduce((sum, p) => sum + (p || 0), 0)
    const bookingFee = subtotal * 0.05
    const gst = subtotal * 0.05
    const total = Math.round((subtotal + bookingFee + gst) * 100) / 100

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      bookingFee: Math.round(bookingFee * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      total
    }
  }, [movie, selectedSeats, seats, selectedShowtime])

  const calculateTotal = () => pricing.total

  const handleContinue = () => {
    if (step === 0) {
      if (!selectedDate) {
        alert('Please select a date')
        return
      }
      if (!selectedShowtime) {
        alert('Please select a showtime')
        return
      }
      // Ensure seats are loaded before proceeding
      if (Object.keys(seats).length === 0) {
        fetchSeatsForShowtime(selectedShowtime.show_id).then(() => {
          setStep(1)
        })
      } else {
        setStep(1)
      }
      return
    }

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
      // Note: Seats will remain locked until booking is completed or cancelled
      const bookingData = {
        booking_type: 'movie',
        item_id: movieId,
        showtime_id: selectedShowtime?.show_id,
        quantity: selectedSeats.length,
        seats: selectedSeats,
        viewer_details: viewerDetails,
        total_amount: pricing.total,
        item: movie,
        basePrice: pricing.subtotal,
        bookingFee: pricing.bookingFee,
        gst: pricing.gst,
        pricing,
        eventDate: selectedDate,
        eventTime: selectedShowtime?.time,
        venue: `${selectedShowtime?.theatre ?? movie?.theater ?? ''}${selectedShowtime?.theatre_address || movie?.theater_address ? ', ' + (selectedShowtime?.theatre_address || movie.theater_address) : ''}`
      }
      navigate('/payment', { state: { bookingData } })
      return
    }

    setStep(s => s + 1)
  }

  const handleBack = async () => {
    // Unlock seats if going back from step 2 or 3
    if ((step === 2 || step === 3) && selectedSeats.length > 0 && selectedShowtime?.show_id && selectedShowtime.show_id !== 'legacy' && !selectedShowtime.show_id.startsWith('legacy_')) {
      try {
        await moviesAPI.unlockSeats(selectedShowtime.show_id, selectedSeats);
      } catch (error) {
        console.error('Error unlocking seats:', error);
      }
    }
    setStep(s => Math.max(1, s - 1))
  }

  // Cleanup: unlock seats when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      if (selectedSeats.length > 0 && selectedShowtime?.show_id && selectedShowtime.show_id !== 'legacy' && !selectedShowtime.show_id.startsWith('legacy_')) {
        moviesAPI.unlockSeats(selectedShowtime.show_id, selectedSeats).catch(err => console.error('Cleanup unlock error:', err));
      }
    };
  }, [selectedSeats, selectedShowtime]);

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

  // derive layout if needed (moved inside component to avoid stale closure)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[0, 1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= stepNumber ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                } font-semibold`}>
                  {stepNumber + 1}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-24 h-1 ${step > stepNumber ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center mt-2 text-sm text-gray-600">
            <div className="w-32 text-center">Date & Time</div>
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
                        <span>
                          {selectedDate 
                            ? formatDate(new Date(selectedDate)) 
                            : (movie.show_date ? formatDate(movie.show_date) : 'Select date')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {selectedShowtime?.time || movie.show_time || 'Select showtime'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>
                          {selectedShowtime?.theatre || movie.theater || 'Select showtime'}
                        </span>
                      </div>
                    </div>

                    {movie.description && (
                      <p className="mt-4 text-gray-600 line-clamp-3">{movie.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 0: Date & Time Selection */}
            {step === 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Select Date</h3>
                  <DatePicker
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    minDate={new Date().toISOString()}
                    maxDate={30}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Select Showtime</h3>
                  {selectedDate ? (
                    <TimeSlotSelector
                      showtimes={showtimes}
                      selectedShowtime={selectedShowtime}
                      onSelect={handleShowtimeSelect}
                      selectedDate={selectedDate}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500 border rounded-lg">
                      <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Please select a date first</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Seat Selection */}
            {step === 1 && (
              <>
                {Object.keys(seats).length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading seats...</p>
                    </CardContent>
                  </Card>
                ) : (
                  <SeatMap
                    seats={seats}
                    layout={{ rows: Object.keys(seats), seatsPerRow: seats[Object.keys(seats)[0]]?.length || 0 }}
                    onSeatSelect={handleSeatSelect}
                    selectedSeats={selectedSeats}
                    maxSeats={10}
                    type="movie"
                  />
                )}
              </>
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
                totalAmount: pricing.total,
                basePrice: pricing.subtotal,
                bookingFee: pricing.bookingFee,
                tax: pricing.gst,
                eventDate: selectedDate || movie.show_date,
                eventTime: selectedShowtime?.time || movie.show_time,
                venue: `${selectedShowtime?.theatre || movie.theater || ''}${selectedShowtime?.theatre_address || movie.theater_address ? ', ' + (selectedShowtime?.theatre_address || movie.theater_address) : ''}`
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
                        (step === 0 && (!selectedDate || !selectedShowtime)) ||
                        (step === 1 && selectedSeats.length === 0) ||
                        (step === 2 && viewerDetails.some(p => !p.name || !p.age || !p.gender))
                      }
                      className="flex-1"
                    >
                      {step === 0 ? 'Continue to Seats' : step === 3 ? 'Proceed to Payment' : 'Continue'}
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
