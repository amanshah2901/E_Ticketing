import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const DatePicker = ({ selectedDate, onDateSelect, minDate, maxDate = 30 }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selected, setSelected] = useState(selectedDate ? new Date(selectedDate) : null)

  useEffect(() => {
    if (selectedDate) {
      setSelected(new Date(selectedDate))
      setCurrentMonth(new Date(selectedDate))
    }
  }, [selectedDate])

  const today = new Date()
  const min = minDate ? new Date(minDate) : today
  min.setHours(0, 0, 0, 0)

  const max = new Date()
  max.setDate(max.getDate() + maxDate)
  max.setHours(23, 59, 59, 59)

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const isDateDisabled = (date) => {
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < min || checkDate > max
  }

  const isDateSelected = (date) => {
    if (!selected) return false
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    )
  }

  const isToday = (date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const handleDateClick = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    if (!isDateDisabled(date)) {
      setSelected(date)
      if (onDateSelect) {
        // Return date in YYYY-MM-DD format
        const dateStr = date.toISOString().split('T')[0]
        onDateSelect(dateStr)
      }
    }
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth)
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const days = []
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null)
  }
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="font-semibold text-lg">
            {monthNames[month]} {year}
          </h3>
          <Button variant="ghost" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />
            }

            const date = new Date(year, month, day)
            const disabled = isDateDisabled(date)
            const selectedDate = isDateSelected(date)
            const todayDate = isToday(date)

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                disabled={disabled}
                className={`
                  aspect-square rounded-md text-sm font-medium transition-colors
                  ${disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : selectedDate
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : todayDate
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {day}
              </button>
            )
          })}
        </div>

        {selected && (
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-sm text-gray-600">Selected Date:</p>
            <p className="font-semibold">
              {selected.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default DatePicker

