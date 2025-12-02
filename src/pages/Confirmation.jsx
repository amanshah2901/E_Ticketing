import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/context/AuthContext'
import { formatCurrency, formatDate } from '@/utils'
import { 
  CheckCircle, 
  Download, 
  Mail, 
  Share2,
  Calendar,
  Clock,
  MapPin,
  Users,
  QrCode
} from 'lucide-react'

const Confirmation = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [booking, setBooking] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('')

  useEffect(() => {
    if (!location.state?.booking) {
      navigate('/my-bookings')
      return
    }
    setBooking(location.state.booking)
    setPaymentMethod(location.state.paymentMethod || 'razorpay')
  }, [location, navigate])

  const handleDownloadTicket = () => {
    // In a real app, this would generate and download a PDF ticket
    alert('Ticket download feature would be implemented here')
  }

  const handleShareBooking = () => {
    if (navigator.share) {
      navigator.share({
        title: `My ${booking.booking_type} Booking`,
        text: `I booked ${booking.item_title} on TicketHub!`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Booking link copied to clipboard!')
    }
  }

  const handleViewBookings = () => {
    navigate('/my-bookings')
  }

  const handleBookMore = () => {
    navigate('/')
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-xl text-gray-600 mb-4">
            Your {booking.booking_type} has been successfully booked
          </p>
          <Badge variant="default" className="bg-green-500 text-white text-lg px-4 py-2">
            Reference: {booking.booking_reference}
          </Badge>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Item Summary */}
                  <div className="flex items-start gap-4">
                    <img 
                      src={booking.item_id?.poster_url || booking.item_id?.image_url || '/default-image.jpg'} 
                      alt={booking.item_title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{booking.item_title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <Badge variant="outline" className="capitalize">
                          {booking.booking_type}
                        </Badge>
                        <span>•</span>
                        <span>Booking #{booking.booking_reference}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Event Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Date</div>
                        <div className="font-semibold">{formatDate(booking.event_date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Time</div>
                        <div className="font-semibold">{booking.event_time}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:col-span-2">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-600">Venue</div>
                        <div className="font-semibold">{booking.venue_details}</div>
                      </div>
                    </div>
                  </div>

                  {/* Passenger/Seat Details */}
                  {booking.seats && booking.seats.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Seat Details
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {booking.seats.map(seat => (
                            <Badge key={seat} variant="default" className="bg-blue-500 text-white">
                              {seat}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {booking.passenger_details && booking.passenger_details.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-semibold mb-3">Passenger Details</h4>
                        <div className="space-y-3">
                          {booking.passenger_details.map((passenger, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg">
                              <div className="font-medium">
                                {booking.seats ? `Seat ${booking.seats[index]}` : `Passenger ${index + 1}`}
                              </div>
                              <div className="text-sm text-gray-600">
                                {passenger.name}, {passenger.age} years, {passenger.gender}
                                {passenger.phone && `, ${passenger.phone}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* QR Code */}
                  {booking.qr_code_url && (
                    <>
                      <Separator />
                      <div className="text-center">
                        <h4 className="font-semibold mb-3 flex items-center justify-center gap-2">
                          <QrCode className="w-4 h-4" />
                          E-Ticket QR Code
                        </h4>
                        <img 
                          src={booking.qr_code_url} 
                          alt="QR Code" 
                          className="w-48 h-48 mx-auto border rounded-lg"
                        />
                        <p className="text-sm text-gray-600 mt-2">
                          Show this QR code at the venue for entry
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Payment Method</span>
                    <span className="font-semibold capitalize">
                      {paymentMethod === 'wallet' ? 'TicketHub Wallet' : paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Status</span>
                    <Badge variant="default" className="bg-green-500 text-white">
                      Completed
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Booking Status</span>
                    <Badge variant="default" className="bg-blue-500 text-white">
                      Confirmed
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Paid</span>
                    <span className="text-green-600">{formatCurrency(booking.total_amount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Button onClick={handleDownloadTicket} className="w-full" size="lg">
                    <Download className="w-4 h-4 mr-2" />
                    Download Ticket
                  </Button>
                  
                  <Button onClick={handleShareBooking} variant="outline" className="w-full" size="lg">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Booking
                  </Button>
                  
                  <Button onClick={handleViewBookings} variant="outline" className="w-full" size="lg">
                    <Mail className="w-4 h-4 mr-2" />
                    View All Bookings
                  </Button>

                  <Separator />

                  <Button onClick={handleBookMore} variant="ghost" className="w-full">
                    Book Another Experience
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h4 className="font-semibold text-blue-800 mb-3">Need Help?</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <div>📧 Confirmation sent to: {user?.email}</div>
                  <div>📞 Support: 1800-123-4567</div>
                  <div>🕒 Available 24/7</div>
                </div>
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-6">
                <h4 className="font-semibold text-yellow-800 mb-3">Important Notes</h4>
                <ul className="text-sm text-yellow-700 space-y-2">
                  <li>• Arrive at least 30 minutes before the event</li>
                  <li>• Carry a valid ID proof for verification</li>
                  <li>• E-ticket QR code must be presented for entry</li>
                  <li>• Keep this confirmation for your records</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 text-center"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What's Next?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow-sm border">
              <div className="text-3xl mb-3">📧</div>
              <h3 className="font-semibold mb-2">Email Confirmation</h3>
              <p className="text-gray-600 text-sm">
                A detailed confirmation has been sent to your email address
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm border">
              <div className="text-3xl mb-3">📱</div>
              <h3 className="font-semibold mb-2">Mobile Ticket</h3>
              <p className="text-gray-600 text-sm">
                Show the QR code on your phone at the venue for entry
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-sm border">
              <div className="text-3xl mb-3">🔔</div>
              <h3 className="font-semibold mb-2">Reminders</h3>
              <p className="text-gray-600 text-sm">
                We'll send you reminders before your event date
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Confirmation