import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import SearchPage from './pages/SearchPage'
import MovieBooking from './pages/MovieBooking'
import BusBooking from './pages/BusBooking'
import EventBooking from './pages/EventBooking'
import TourBooking from './pages/TourBooking'
import Payment from './pages/Payment'
import Confirmation from './pages/Confirmation'
import MyBookings from './pages/MyBookings'
import TicketView from './pages/TicketView'
import AdminDashboard from './pages/AdminDashboard'
import Profile from './pages/Profile'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import { useAuth } from './context/AuthContext'

function App() {
  const { user } = useAuth()

  console.log('App component is loading...')

  return (
    <Layout>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route path="/movie-booking" element={<MovieBooking />} />
        <Route path="/bus-booking" element={<BusBooking />} />
        <Route path="/event-booking" element={<EventBooking />} />
        <Route path="/tour-booking" element={<TourBooking />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/ticket/:bookingId" element={<TicketView />} />
        <Route path="/profile" element={<Profile />} />

        {/* Admin Only Routes */}
        {user?.role === 'admin' && (
          <Route path="/admin" element={<AdminDashboard />} />
        )}

        {/* 404 Route */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
              <p className="text-gray-600 mb-4">Page not found</p>
              <a href="/" className="text-indigo-600 hover:text-indigo-700">
                Go back home
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Layout>
  )
}

export default App