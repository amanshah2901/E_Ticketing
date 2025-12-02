import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import BookingSummary from '@/components/booking/BookingSummary'
import { eventsAPI } from '@/api/services'
import { formatCurrency, formatDate } from '@/utils'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users,
  Music,
  User
} from 'lucide-react'

const EventBooking = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [viewerDetails, setviewerDetails] = useState([{ name: '', age: '', gender: '' }])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1) // 1: Select Quantity, 2: viewer Details, 3: Review

  const eventId = searchParams.get('id')

  useEffect(() => {
    if (!user) {
      navigate('/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return
    }
    fetchEventDetails()
  }, [eventId, user, navigate])

  const fetchEventDetails = async () => {
  try {
    setLoading(true)
    const eventData = await eventsAPI.getEventById(eventId)
    setEvent(eventData)   // FIXED HERE
  } catch (error) {
    console.error('Error fetching event details:', error)
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    // Adjust viewer details based on quantity
    if (quantity > viewerDetails.length) {
      const newDetails = [...viewerDetails]
      while (newDetails.length < quantity) {
        newDetails.push({ name: '', age: '', gender: '' })
      }
      setviewerDetails(newDetails)
    } else if (quantity < viewerDetails.length) {
      setviewerDetails(viewerDetails.slice(0, quantity))
    }
  }, [quantity])

  const updateviewerDetail = (index, field, value) => {
    const newDetails = [...viewerDetails]
    newDetails[index][field] = value
    setviewerDetails(newDetails)
  }

  const calculateTotal = () => {
    if (!event) return 0
    
    const subtotal = event.price * quantity
    const bookingFee = subtotal * 0.05
    const tax = (subtotal + bookingFee) * 0.05
    
    return subtotal + bookingFee + tax
  }

  const handleContinue = () => {
    if (step === 1 && quantity === 0) {
      alert('Please select at least one ticket')
      return
    }
    
    if (step === 2) {
      for (let i = 0; i < viewerDetails.length; i++) {
        const viewer = viewerDetails[i]
        if (!viewer.name || !viewer.age || !viewer.gender) {
          alert(`Please fill all details for attendee ${i + 1}`)
          return
        }
      }
    }

    if (step === 3) {
      const bookingData = {
        booking_type: 'event',
        item_id: eventId,
        quantity: quantity,
        viewer_details: viewerDetails,
        total_amount: calculateTotal(),
        item: event,
        basePrice: event.price,
        eventDate: event.event_date,
        eventTime: event.event_time,
        venue: `${event.venue}, ${event.city}`
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
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Event not found</h1>
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
            <div className="w-32 text-center">Select Tickets</div>
            <div className="w-32 text-center">Attendee Details</div>
            <div className="w-32 text-center">Review & Pay</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <img 
                    src={event.image_url || '/default-event-image.jpg'} 
                    alt={event.title}
                    className="w-32 h-48 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h1 className="text-2xl font-bold mb-2">{event.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <Badge variant="outline" className="capitalize">
                            {event.category}
                          </Badge>
                          <span>•</span>
                          <Badge variant="outline">{event.age_restriction}</Badge>
                          {event.event_type && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{event.event_type}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-500 text-white">
                        {event.available_tickets} tickets left
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{event.event_time}</span>
                      </div>
                      <div className="flex items-center gap-2 md:col-span-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{event.venue}, {event.city}</span>
                      </div>
                    </div>

                    {event.organizer && (
                      <div className="mt-3">
                        <div className="text-sm text-gray-600">Organized by</div>
                        <div className="font-semibold">{event.organizer}</div>
                      </div>
                    )}

                    {event.description && (
                      <p className="mt-4 text-gray-600 line-clamp-3">{event.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 1: Ticket Selection */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Select Number of Tickets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
                      <div>
                        <h3 className="font-semibold">General Admission</h3>
                        <p className="text-sm text-gray-600">Standard event ticket</p>
                        <div className="text-lg font-bold text-green-600 mt-1">
                          {formatCurrency(event.price)} per ticket
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-semibold">{quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQuantity(Math.min(event.available_tickets, quantity + 1))}
                          disabled={quantity >= event.available_tickets}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {event.terms_conditions && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2">Important Terms</h4>
                        <p className="text-sm text-yellow-700">{event.terms_conditions}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Attendee Details */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Attendee Details ({quantity} {quantity === 1 ? 'Attendee' : 'Attendees'})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {viewerDetails.map((attendee, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border rounded-lg bg-white"
                      >
                        <h3 className="font-semibold mb-4">Attendee {index + 1}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <Input
                              value={attendee.name}
                              onChange={(e) => updateviewerDetail(index, 'name', e.target.value)}
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
                              value={attendee.age}
                              onChange={(e) => updateviewerDetail(index, 'age', e.target.value)}
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
                              value={attendee.gender}
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
                      <h4 className="font-semibold text-green-800 mb-2">Ticket Summary</h4>
                      <div className="flex justify-between">
                        <span>{quantity} {quantity === 1 ? 'Ticket' : 'Tickets'}</span>
                        <span className="font-semibold">{formatCurrency(event.price * quantity)}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Attendee Details</h4>
                      <div className="space-y-3">
                        {viewerDetails.map((attendee, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium">Attendee {index + 1}</div>
                            <div className="text-sm text-gray-600">
                              {attendee.name}, {attendee.age} years, {attendee.gender}
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
                item: event,
                quantity: quantity,
                viewerDetails,
                totalAmount: calculateTotal(),
                basePrice: event.price,
                eventDate: event.event_date,
                eventTime: event.event_time,
                venue: `${event.venue}, ${event.city}`
              }}
              type="event"
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
                        (step === 1 && quantity === 0) ||
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
                <h4 className="font-semibold text-blue-800 mb-2">Event Information</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Please arrive at least 30 minutes before event start</li>
                  <li>• Carry a valid ID proof for age verification</li>
                  <li>• E-tickets will be sent to your email</li>
                  <li>• No outside food or drinks allowed</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventBooking