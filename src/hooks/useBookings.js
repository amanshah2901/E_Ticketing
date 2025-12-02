import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsAPI } from '../api/services'

export const useBookings = (params = {}) => {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingsAPI.getUserBookings(params),
  })
}

export const useBooking = (id) => {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsAPI.getBookingById(id),
    enabled: !!id,
  })
}

export const useCreateBooking = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: bookingsAPI.createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings'])
    },
  })
}

export const useCancelBooking = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, reason }) => bookingsAPI.cancelBooking(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings'])
    },
  })
}

export const useBookingStats = () => {
  return useQuery({
    queryKey: ['booking-stats'],
    queryFn: () => bookingsAPI.getBookingStats(),
  })
}