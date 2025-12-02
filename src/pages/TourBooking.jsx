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
import { toursAPI } from '@/api/services'
import { formatCurrency, formatDate } from '@/utils'
import { 
  Calendar, 
  MapPin, 
  Users,
  Mountain,
  Star,
  Clock
} from 'lucide-react'

const TourBooking = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [tour, setTour] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [viewerDetails, setviewerDetails] = useState([{ name: '', age: '', gender: '', phone: '' }])
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(1)

  const tourId = searchParams.get('id')

  useEffect(() => {
    if (!user) {
      navigate('/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))
      return
    }
    fetchTourDetails()
  }, [tourId, user, navigate])

  const fetchTourDetails = async () => {
    try {
      setLoading(true)
      const tourData = await toursAPI.getTourById(tourId)
      setTour(tourData)
    } catch (error) {
      console.error('Error fetching tour details:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (quantity > viewerDetails.length) {
      const newDetails = [...viewerDetails]
      while (newDetails.length < quantity) {
        newDetails.push({ name: '', age: '', gender: '', phone: '' })
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
    if (!tour) return 0
    
    const subtotal = tour.price_per_person * quantity
    const bookingFee = subtotal * 0.05
    const tax = (subtotal + bookingFee) * 0.05
    
    return subtotal + bookingFee + tax
  }

  const handleContinue = () => {
    if (step === 1 && quantity === 0) {
      alert('Please select at least one slot')
      return
    }
    
    if (step === 2) {
      for (let i = 0; i < viewerDetails.length; i++) {
        const viewer = viewerDetails[i]
        if (!viewer.name || !viewer.age || !viewer.gender) {
          alert(`Please fill all required details for participant ${i + 1}`)
          return
        }
      }
    }

    if (step === 3) {
      const bookingData = {
        booking_type: 'tour',
        item_id: tourId,
        quantity: quantity,
        viewer_details: viewerDetails,
        total_amount: calculateTotal(),
        item: tour,
        basePrice: tour.price_per_person,
        eventDate: tour.start_date,
        eventTime: 'Check itinerary',
        venue: tour.destination
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
          <p className="mt-4 text-gray-600">Loading tour details...</p>
        </div>
      </div>
    )
  }

  if (!tour) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tour not found</h1>
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
            <div className="w-32 text-center">Select Slots</div>
            <div className="w-32 text-center">Participant Details</div>
            <div className="w-32 text-center">Review & Pay</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tour Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <img 
                    src={tour.image_url || '/default-tour-image.jpg'} 
                    alt={tour.title}
                    className="w-32 h-48 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h1 className="text-2xl font-bold mb-2">{tour.title}</h1>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <Badge variant="outline" className="capitalize">
                            {tour.tour_type}
                          </Badge>
                          <span>•</span>
                          <Badge variant="outline" className="capitalize">
                            {tour.difficulty_level}
                          </Badge>
                          {tour.ratings?.average > 0 && (
                            <>
                              <span>•</span>
                              <Badge className="bg-yellow-500 text-white border-0">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                {tour.ratings.average} ({tour.ratings.count})
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="default" className={
                        tour.available_slots <= 5 ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                      }>
                        {tour.available_slots} slots left
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{tour.destination}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{tour.duration}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Starts {formatDate(tour.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>Ends {formatDate(tour.end_date)}</span>
                      </div>
                    </div>

                    {tour.tour_operator && (
                      <div className="mt-3">
                        <div className="text-sm text-gray-600">Operated by</div>
                        <div className="font-semibold">{tour.tour_operator}</div>
                      </div>
                    )}

                    {tour.description && (
                      <p className="mt-4 text-gray-600 line-clamp-3">{tour.description}</p>
                    )}

                    {/* Tour Highlights */}
                    {tour.highlights && tour.highlights.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Tour Highlights</h4>
                        <div className="flex flex-wrap gap-2">
                          {tour.highlights.slice(0, 5).map(highlight => (
                            <Badge key={highlight} variant="secondary">
                              {highlight}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 1: Slot Selection */}
            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Select Number of Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-white">
                      <div>
                        <h3 className="font-semibold">Tour Package</h3>
                        <p className="text-sm text-gray-600">Per person package</p>
                        <div className="text-lg font-bold text-green-600 mt-1">
                          {formatCurrency(tour.price_per_person)} per person
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
                          onClick={() => setQuantity(Math.min(tour.available_slots, quantity + 1))}
                          disabled={quantity >= tour.available_slots}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    {/* Inclusions */}
                    {tour.inclusions && tour.inclusions.length > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold text-green-800 mb-2">What's Included</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          {tour.inclusions.slice(0, 5).map(inclusion => (
                            <li key={inclusion}>• {inclusion}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Requirements */}
                    {tour.requirements && tour.requirements.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-semibold text-yellow-800 mb-2">Requirements</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {tour.requirements.slice(0, 5).map(requirement => (
                            <li key={requirement}>• {requirement}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Participant Details */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Participant Details ({quantity} {quantity === 1 ? 'Participant' : 'Participants'})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {viewerDetails.map((participant, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border rounded-lg bg-white"
                      >
                        <h3 className="font-semibold mb-4">Participant {index + 1}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <Input
                              value={participant.name}
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
                              value={participant.age}
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
                              value={participant.gender}
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
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <Input
                              value={participant.phone}
                              onChange={(e) => updateviewerDetail(index, 'phone', e.target.value)}
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
                      <h4 className="font-semibold text-green-800 mb-2">Tour Summary</h4>
                      <div className="flex justify-between">
                        <span>{quantity} {quantity === 1 ? 'Participant' : 'Participants'}</span>
                        <span className="font-semibold">{formatCurrency(tour.price_per_person * quantity)}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Participant Details</h4>
                      <div className="space-y-3">
                        {viewerDetails.map((participant, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium">Participant {index + 1}</div>
                            <div className="text-sm text-gray-600">
                              {participant.name}, {participant.age} years, {participant.gender}
                              {participant.phone && `, ${participant.phone}`}
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
                item: tour,
                quantity: quantity,
                viewerDetails,
                totalAmount: calculateTotal(),
                basePrice: tour.price_per_person,
                eventDate: tour.start_date,
                eventTime: 'Check itinerary',
                venue: tour.destination
              }}
              type="tour"
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
                <h4 className="font-semibold text-blue-800 mb-2">Tour Information</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Detailed itinerary will be shared after booking</li>
                  <li>• Carry valid ID proof and necessary documents</li>
                  <li>• Follow guide instructions during the tour</li>
                  <li>• Cancellation policy applies as per terms</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TourBooking