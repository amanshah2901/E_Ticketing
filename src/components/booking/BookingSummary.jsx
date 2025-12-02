import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate } from '@/utils'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Ticket, 
  Armchair,
  Bus,
  Music,
  Mountain
} from 'lucide-react'

const BookingSummary = ({ 
  bookingData, 
  type = 'movie',
  showActions = false,
  onEdit,
  onContinue 
}) => {
  const {
    item,
    selectedSeats = [],
    quantity = 1,
    passengerDetails = [],
    totalAmount,
    basePrice,
    tax = 0,
    bookingFee = 0,
    eventDate,
    eventTime,
    venue
  } = bookingData || {}

  const getTypeIcon = () => {
    switch (type) {
      case 'movie': return <Ticket className="w-5 h-5" />
      case 'bus': return <Bus className="w-5 h-5" />
      case 'event': return <Music className="w-5 h-5" />
      case 'tour': return <Mountain className="w-5 h-5" />
      default: return <Ticket className="w-5 h-5" />
    }
  }

  const getTypeColor = () => {
    switch (type) {
      case 'movie': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'bus': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'event': return 'bg-green-100 text-green-800 border-green-200'
      case 'tour': return 'bg-orange-100 text-orange-800 border-orange-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (!bookingData || !item) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No booking data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          {getTypeIcon()}
          Booking Summary
          <Badge variant="outline" className={getTypeColor()}>
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Item Details */}
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{item.title || item.name}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(eventDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{eventTime}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 md:col-span-2">
              <MapPin className="w-4 h-4" />
              <span>{venue}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Booking Details */}
        <div className="space-y-3">
          <h4 className="font-medium">Booking Details</h4>
          
          {selectedSeats.length > 0 && (
            <div className="flex items-center gap-2">
              <Armchair className="w-4 h-4 text-gray-600" />
              <span className="text-sm">Seats: </span>
              <div className="flex flex-wrap gap-1">
                {selectedSeats.map(seat => (
                  <Badge key={seat} variant="secondary" className="text-xs">
                    {seat}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {quantity > 0 && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm">Quantity: {quantity}</span>
            </div>
          )}

          {/* Passenger Details */}
          {passengerDetails.length > 0 && (
            <div className="mt-3">
              <h5 className="font-medium text-sm mb-2">Passenger Details</h5>
              <div className="space-y-2">
                {passengerDetails.map((passenger, index) => (
                  <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-medium">{passenger.name}</div>
                    <div className="text-gray-600">
                      {passenger.age} years • {passenger.gender}
                      {passenger.phone && ` • ${passenger.phone}`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Price Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium">Price Breakdown</h4>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Base Price</span>
              <span>{formatCurrency(basePrice || totalAmount)}</span>
            </div>
            
            {bookingFee > 0 && (
              <div className="flex justify-between">
                <span>Booking Fee</span>
                <span>{formatCurrency(bookingFee)}</span>
              </div>
            )}
            
            {tax > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between font-semibold text-base">
              <span>Total Amount</span>
              <span className="text-green-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex gap-3 pt-4">
            <button
              onClick={onEdit}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={onContinue}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default BookingSummary