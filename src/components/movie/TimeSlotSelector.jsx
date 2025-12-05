import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import { formatCurrency } from '@/utils'

const TimeSlotSelector = ({ showtimes, selectedShowtime, onSelect, selectedDate }) => {
  if (!showtimes) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Loading showtimes...</p>
      </div>
    )
  }

  if (!selectedDate) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>Please select a date first</p>
      </div>
    )
  }

  // Handle both date string and Date object - normalize to YYYY-MM-DD format
  let dateStr = ''
  if (typeof selectedDate === 'string') {
    dateStr = selectedDate.split('T')[0]
  } else if (selectedDate instanceof Date) {
    dateStr = selectedDate.toISOString().split('T')[0]
  } else if (selectedDate) {
    // Try to parse as date string
    const dateObj = new Date(selectedDate)
    if (!isNaN(dateObj.getTime())) {
      dateStr = dateObj.toISOString().split('T')[0]
    } else {
      dateStr = String(selectedDate).split('T')[0]
    }
  }
  
  const dateShowtimes = showtimes[dateStr] || {}

  if (Object.keys(dateShowtimes).length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No showtimes available for this date</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(dateShowtimes).map(([theatre, theatreData]) => {
        // Handle both new structure (with shows array) and legacy structure
        const shows = theatreData.shows || (theatreData.time ? [{
          show_id: theatreData.show_id || 'legacy',
          time: theatreData.time,
          base_price: theatreData.base_price || theatreData.price,
          available_seats: theatreData.available_seats || 0,
          total_seats: theatreData.total_seats || 100
        }] : [])

        return (
          <div key={theatre} className="border rounded-lg p-4">
            <div className="mb-3">
              <h4 className="font-semibold text-lg">{theatre}</h4>
              {theatreData.theatre_address && (
                <p className="text-sm text-gray-600">{theatreData.theatre_address}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {shows.map((show) => {
                const isSelected = selectedShowtime?.show_id === show.show_id
                const isAvailable = show.available_seats > 0

                return (
                  <button
                    key={show.show_id}
                    onClick={() => isAvailable && onSelect(show)}
                    disabled={!isAvailable}
                    className={`
                      px-4 py-2 rounded-lg border-2 transition-all
                      ${isSelected
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : isAvailable
                        ? 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                      }
                    `}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold">{show.time}</span>
                      <span className="text-xs">{formatCurrency(show.base_price)}</span>
                      {show.available_seats < 10 && show.available_seats > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {show.available_seats} left
                        </Badge>
                      )}
                      {show.available_seats === 0 && (
                        <Badge variant="destructive" className="text-xs">
                          Sold Out
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TimeSlotSelector

