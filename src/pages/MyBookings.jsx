import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBookings, useCancelBooking, useBookingStats } from '@/hooks/useBookings'
import { formatCurrency, formatDate, getBookingStatusColor } from '@/utils'
import { 
  Search, 
  Filter, 
  Download, 
  Eye,
  X,
  Calendar,
  MapPin,
  Users,
  Film,
  Bus,
  Music,
  Mountain
} from 'lucide-react'

const MyBookings = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const { data: bookingsData, isLoading } = useBookings({ 
    status: activeTab === 'all' ? undefined : activeTab,
    type: typeFilter === 'all' ? undefined : typeFilter
  })
  const { data: statsData } = useBookingStats()
  const cancelBookingMutation = useCancelBooking()

  const bookings = bookingsData?.bookings || []
  const stats = statsData?.overview || {}

  const handleCancelBooking = async (bookingId, reason = 'Personal reasons') => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) {
      return
    }

    try {
      await cancelBookingMutation.mutateAsync({ id: bookingId, reason })
      alert('Booking cancelled successfully')
    } catch (error) {
      alert('Failed to cancel booking: ' + error.message)
    }
  }

  const filteredBookings = bookings.filter(booking =>
    booking.item_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    booking.booking_reference.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeIcon = (type) => {
    switch (type) {
      case 'movie': return <Film className="w-4 h-4" />
      case 'bus': return <Bus className="w-4 h-4" />
      case 'event': return <Music className="w-4 h-4" />
      case 'tour': return <Mountain className="w-4 h-4" />
      default: return <Film className="w-4 h-4" />
    }
  }

  const BookingCard = ({ booking }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {getTypeIcon(booking.booking_type)}
            <div>
              <h3 className="font-semibold text-lg">{booking.item_title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="capitalize">
                  {booking.booking_type}
                </Badge>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">{booking.booking_reference}</span>
              </div>
            </div>
          </div>
          <Badge className={getBookingStatusColor(booking.booking_status)}>
            {booking.booking_status}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-600">Date</div>
              <div className="font-medium">{formatDate(booking.event_date)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-600">Venue</div>
              <div className="font-medium line-clamp-1">{booking.venue_details}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <div>
              <div className="text-gray-600">Quantity</div>
              <div className="font-medium">
                {booking.quantity || booking.seats?.length || 1} {booking.booking_type === 'movie' ? 'seats' : 'tickets'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 text-gray-400">₹</div>
            <div>
              <div className="text-gray-600">Amount</div>
              <div className="font-medium text-green-600">{formatCurrency(booking.total_amount)}</div>
            </div>
          </div>
        </div>

        {booking.seats && booking.seats.length > 0 && (
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Selected Seats:</div>
            <div className="flex flex-wrap gap-1">
              {booking.seats.map(seat => (
                <Badge key={seat} variant="secondary" className="text-xs">
                  {seat}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-500">
            Booked on {formatDate(booking.createdAt)}
          </div>
          <div className="flex items-center gap-2">
            
            
            {booking.booking_status === 'confirmed' && booking.canBeCancelled && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCancelBooking(booking._id)}
                disabled={cancelBookingMutation.isLoading}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}

            {booking.booking_status === 'confirmed' && (
              <Button variant="default" size="sm" asChild>
                <Link to={`/ticket/${booking._id}`}>
                  <Download className="w-4 h-4 mr-1" />
                  View Ticket
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
          <p className="text-gray-600">Manage and view all your bookings in one place</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">{stats.total_bookings || 0}</div>
              <div className="text-sm text-gray-600">Total Bookings</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">{stats.confirmed_bookings || 0}</div>
              <div className="text-sm text-gray-600">Confirmed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-blue-600">{stats.cancelled_bookings || 0}</div>
              <div className="text-sm text-gray-600">Cancelled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(stats.total_spent || 0)}
              </div>
              <div className="text-sm text-gray-600">Total Spent</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search bookings by title or reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="movie">Movies</SelectItem>
                  <SelectItem value="bus">Buses</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                  <SelectItem value="tour">Tours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {bookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed
              <Badge variant="secondary" className="ml-2">
                {stats.confirmed_bookings || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled
              <Badge variant="secondary" className="ml-2">
                {stats.cancelled_bookings || 0}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    {activeTab === 'all' ? (
                      <Users className="w-16 h-16 mx-auto" />
                    ) : (
                      <Filter className="w-16 h-16 mx-auto" />
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {activeTab === 'all' ? 'No bookings yet' : `No ${activeTab} bookings`}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {activeTab === 'all' 
                      ? "You haven't made any bookings yet. Start exploring and book your first experience!"
                      : `You don't have any ${activeTab} bookings at the moment.`
                    }
                  </p>
                  {activeTab === 'all' && (
                    <Button asChild>
                      <Link to="/">
                        Start Booking
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredBookings.map(booking => (
                <BookingCard key={booking._id} booking={booking} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Upcoming Bookings */}
        {bookings.some(b => b.booking_status === 'confirmed') && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings
                  .filter(b => b.booking_status === 'confirmed')
                  .slice(0, 3)
                  .map(booking => (
                    <div key={booking._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTypeIcon(booking.booking_type)}
                        <div>
                          <div className="font-semibold">{booking.item_title}</div>
                          <div className="text-sm text-gray-600">
                            {formatDate(booking.event_date)} • {booking.event_time}
                          </div>
                        </div>
                      </div>
                        <Button variant="default" size="sm" asChild>
                          <Link to={`/ticket/${booking._id}`}>
                            <Download className="w-4 h-4 mr-1" />
                            View Ticket
                          </Link>
                        </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default MyBookings
