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
import { busesAPI } from '@/api/services'
import { formatCurrency, formatDate } from '@/utils'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  Bus,
  Star
} from 'lucide-react'

const BusBooking = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [bus, setBus] = useState(null)
  const [seats, setSeats] = useState({})
  const [selectedSeats, setSelectedSeats] = useState([])
  const [passengerDetails, setPassengerDetails] = useState([{ name: '', age: '', gender: '', phone: '' }])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)

  const busId = searchParams.get('id')

  useEffect(() => {
    if (!user) {
      navigate('/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return
    }
    fetchBusDetails()
  }, [busId, user, navigate])

  const fetchBusDetails = async () => {
    try {
      setLoading(true)
      const busData = await busesAPI.getBusById(busId)
      const seatsData = await busesAPI.getBusSeats(busId)
      
      setBus(busData)
      setSeats(seatsData.data ? seatsData.data.seats : seatsData.seats)
    } catch (error) {
      console.error('Error fetching bus details:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSeatSelect = (selected) => {
    setSelectedSeats(selected)
    if (selected.length > passengerDetails.length) {
      const newDetails = [...passengerDetails]
      while (newDetails.length < selected.length) {
        newDetails.push({ name: '', age: '', gender: '', phone: '' })
      }
      setPassengerDetails(newDetails)
    } else if (selected.length < passengerDetails.length) {
      setPassengerDetails(passengerDetails.slice(0, selected.length))
    }
  }

  const updatePassengerDetail = (index, field, value) => {
    const newDetails = [...passengerDetails]
    newDetails[index][field] = value
    setPassengerDetails(newDetails)
  }

  const calculatePricing = () => {
    if (!bus || selectedSeats.length === 0) {
      return { subtotal: 0, bookingFee: 0, tax: 0, total: 0 };
    }
    
    const seatPrices = selectedSeats.map(seatNumber => {
      const seat = Object.values(seats).flat().find(s => s.seat_number === seatNumber)
      return seat?.price || bus.price
    })
    
    const subtotal = seatPrices.reduce((sum, price) => sum + price, 0)
    const bookingFee = subtotal * 0.05
    const tax = subtotal * 0.05
    const total = subtotal + bookingFee + tax
    
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      bookingFee: Math.round(bookingFee * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  const calculateTotal = () => {
    return calculatePricing().total;
  }

  const handleContinue = () => {
    if (step === 1 && selectedSeats.length === 0) {
      alert('Please select at least one seat')
      return
    }
    
    if (step === 2) {
      for (let i = 0; i < passengerDetails.length; i++) {
        const passenger = passengerDetails[i]
        if (!passenger.name || !passenger.age || !passenger.gender) {
          alert(`Please fill all required details for passenger ${i + 1}`)
          return
        }
      }
    }

    if (step === 3) {
      const pricing = calculatePricing();
      const bookingData = {
        booking_type: 'bus',
        item_id: busId,
        quantity: selectedSeats.length,
        seats: selectedSeats,
        passenger_details: passengerDetails,
        total_amount: pricing.total,
        item: bus,
        basePrice: pricing.subtotal,
        bookingFee: pricing.bookingFee,
        tax: pricing.tax,
        pricing: pricing,
        eventDate: bus.departure_date,
        eventTime: bus.departure_time,
        venue: `${bus.boarding_point} → ${bus.dropping_point}`
      }
      
      navigate('/payment', { state: { bookingData } })
      return
    }

    setStep(step + 1)
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bus details...</p>
        </div>
      </div>
    )
  }

  if (!bus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bus not found</h1>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((stepNumber) => (
              <React.Fragment key={stepNumber}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= stepNumber 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                } font-semibold`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-24 h-1 ${
                    step > stepNumber ? 'bg-indigo-600' : 'bg-gray-300'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-center mt-2 text-sm text-gray-600">
            <div className="w-32 text-center">Select Seats</div>
            <div className="w-32 text-center">Passenger Details</div>
            <div className="w-32 text-center">Review & Pay</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bus Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{bus.operator}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <Badge variant="outline" className="capitalize">
                        {bus.bus_type.replace(/_/g, ' ')}
                      </Badge>
                      <span>•</span>
                      <span>{bus.bus_number}</span>
                      {bus.ratings?.average > 0 && (
                        <>
                          <span>•</span>
                          <Badge className="bg-yellow-500 text-white border-0">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            {bus.ratings.average} ({bus.ratings.count})
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant="default" className="bg-green-500 text-white">
                    {bus.available_seats} seats left
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-semibold">{bus.from_city}</div>
                        <div className="text-sm text-gray-600">{bus.boarding_point}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-semibold">{formatDate(bus.departure_date)}</div>
                        <div className="text-sm text-gray-600">{bus.departure_time}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-semibold">{bus.to_city}</div>
                        <div className="text-sm text-gray-600">{bus.dropping_point}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-semibold">{bus.duration}</div>
                        <div className="text-sm text-gray-600">Arrival: {bus.arrival_time}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {bus.amenities && bus.amenities.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Amenities</h4>
                    <div className="flex flex-wrap gap-2">
                      {bus.amenities.map(amenity => (
                        <Badge key={amenity} variant="secondary">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 1: Seat Selection */}
            {step === 1 && (
              <SeatMap
                seats={seats}
                layout={bus.seat_layout}
                onSeatSelect={handleSeatSelect}
                selectedSeats={selectedSeats}
                maxSeats={bus.available_seats}
                type="bus"
              />
            )}

            {/* Step 2: Passenger Details */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Passenger Details ({selectedSeats.length} {selectedSeats.length === 1 ? 'Passenger' : 'Passengers'})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {passengerDetails.map((passenger, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border rounded-lg bg-white"
                      >
                        <h3 className="font-semibold mb-4">Passenger {index + 1} - Seat {selectedSeats[index]}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <Input
                              value={passenger.name}
                              onChange={(e) => updatePassengerDetail(index, 'name', e.target.value)}
                              placeholder="Enter full name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Age *
                            </label>
                            <Input
                              type="number"
                              value={passenger.age}
                              onChange={(e) => updatePassengerDetail(index, 'age', e.target.value)}
                              placeholder="Age"
                              min="1"
                              max="120"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Gender *
                            </label>
                            <select
                              value={passenger.gender}
                              onChange={(e) => updatePassengerDetail(index, 'gender', e.target.value)}
                              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              required
                            >
                              <option value="">Select Gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <Input
                              value={passenger.phone}
                              onChange={(e) => updatePassengerDetail(index, 'phone', e.target.value)}
                              placeholder="Phone number"
                              type="tel"
                            />
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
                      <h4 className="font-semibold mb-3">Passenger Details</h4>
                      <div className="space-y-3">
                        {passengerDetails.map((passenger, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium">Passenger {index + 1} - {selectedSeats[index]}</div>
                            <div className="text-sm text-gray-600">
                              {passenger.name}, {passenger.age} years, {passenger.gender}
                              {passenger.phone && `, ${passenger.phone}`}
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
                item: bus,
                selectedSeats,
                quantity: selectedSeats.length,
                passengerDetails,
                totalAmount: calculateTotal(),
                basePrice: bus.price,
                eventDate: bus.departure_date,
                eventTime: bus.departure_time,
                venue: `${bus.from_city} to ${bus.to_city}`
              }}
              type="bus"
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
                      <Button
                        variant="outline"
                        onClick={handleBack}
                        className="flex-1"
                      >
                        Back
                      </Button>
                    )}
                    <Button
                      onClick={handleContinue}
                      disabled={
                        (step === 1 && selectedSeats.length === 0) ||
                        (step === 2 && passengerDetails.some(p => !p.name || !p.age || !p.gender))
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
                <h4 className="font-semibold text-blue-800 mb-2">Travel Information</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Report at boarding point 30 minutes before departure</li>
                  <li>• Carry a valid ID proof</li>
                  <li>• Luggage allowance: 15kg per passenger</li>
                  <li>• Cancellation charges apply as per policy</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BusBooking