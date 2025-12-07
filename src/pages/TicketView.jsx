// src/pages/TicketView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { bookingsAPI } from '@/api/services';
import { formatCurrency, formatDate } from '@/utils';
import { useAuth } from '@/context/AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  Download,
  ArrowLeft,
  QrCode,
  Film,
  Bus,
  Music,
  Mountain
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const TicketView = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchBooking();
  }, [bookingId, user]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getBookingById(bookingId);
      if (response.success) {
        setBooking(response.data);
      } else {
        setError('Booking not found');
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    window.print();
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'movie': return <Film className="w-5 h-5" />;
      case 'bus': return <Bus className="w-5 h-5" />;
      case 'event': return <Music className="w-5 h-5" />;
      case 'tour': return <Mountain className="w-5 h-5" />;
      default: return <Ticket className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'movie': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'bus': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'event': return 'bg-green-100 text-green-800 border-green-200';
      case 'tour': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ticket Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'The ticket you are looking for does not exist.'}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" asChild>
                <Link to="/my-bookings">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Bookings
                </Link>
              </Button>
              <Button asChild>
                <Link to="/">Go Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate QR code data
  const qrData = JSON.stringify({
    bookingId: booking._id,
    bookingReference: booking.booking_reference,
    type: booking.booking_type,
    date: booking.event_date,
    time: booking.event_time
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:py-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Actions (hidden in print) */}
        <div className="mb-6 print:hidden flex items-center justify-between">
          <Button variant="outline" asChild>
            <Link to="/my-bookings">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Link>
          </Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download Ticket
          </Button>
        </div>

        {/* Ticket Card */}
        <Card className="bg-white shadow-xl print:shadow-none">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white print:bg-indigo-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getTypeIcon(booking.booking_type)}
                <div>
                  <CardTitle className="text-2xl text-white">Your Ticket</CardTitle>
                  <p className="text-indigo-100 text-sm mt-1">
                    Booking Reference: {booking.booking_reference}
                  </p>
                </div>
              </div>
              <Badge className={getTypeColor(booking.booking_type)}>
                {booking.booking_type?.toUpperCase() || 'TICKET'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Main Ticket Info */}
              <div className="md:col-span-2 space-y-6">
                {/* Item Details */}
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {booking.item_title || booking.item_id?.title || booking.item_id?.name}
                  </h2>
                  <p className="text-gray-600">
                    {booking.booking_type === 'movie' && booking.item_id?.description}
                    {booking.booking_type === 'bus' && `${booking.item_id?.from_city} → ${booking.item_id?.to_city}`}
                    {booking.booking_type === 'event' && booking.item_id?.description}
                    {booking.booking_type === 'tour' && booking.item_id?.description}
                  </p>
                </div>

                <Separator />

                {/* Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold text-gray-900">
                        {formatDate(booking.event_date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-semibold text-gray-900">
                        {booking.event_time || 'TBD'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 md:col-span-2">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">Venue</p>
                      <p className="font-semibold text-gray-900">
                        {booking.venue_details || 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Booking Details */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Booking Details</h3>
                  <div className="space-y-3">
                    {booking.seats && booking.seats.length > 0 && (
                      <div className="flex items-center gap-3">
                        <Ticket className="w-5 h-5 text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Seats</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {booking.seats.map((seat, index) => (
                              <Badge key={index} variant="secondary">
                                {seat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Quantity</p>
                        <p className="font-semibold text-gray-900">
                          {booking.quantity || booking.seats?.length || 1}
                        </p>
                      </div>
                    </div>

                    {booking.passenger_details && booking.passenger_details.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Passenger Details</p>
                        <div className="space-y-2">
                          {booking.passenger_details.map((passenger, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg text-sm">
                              <p className="font-medium">{passenger.name}</p>
                              <p className="text-gray-600">
                                {passenger.age} years • {passenger.gender}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Payment Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    {booking.subtotal !== undefined && booking.subtotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-medium">{formatCurrency(booking.subtotal)}</span>
                      </div>
                    )}
                    {booking.booking_fee !== undefined && booking.booking_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Booking Fee (5%)</span>
                        <span className="font-medium">{formatCurrency(booking.booking_fee)}</span>
                      </div>
                    )}
                    {booking.tax !== undefined && booking.tax > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">GST (5%)</span>
                        <span className="font-medium">{formatCurrency(booking.tax)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-gray-900 font-semibold">Total Amount</span>
                      <span className="text-2xl font-bold text-green-600">
                        {formatCurrency(booking.total_amount)}
                      </span>
                    </div>
                  </div>
                  {booking.payment_method && (
                    <div className="mt-3 text-sm text-gray-500">
                      Paid via {booking.payment_method.toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center border-l-2 border-dashed border-gray-300 pl-8 print:border-none print:pl-0">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG
                    value={qrData}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center max-w-[200px]">
                  Scan this QR code at the venue for entry
                </p>
                <div className="mt-6 text-center">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {booking.booking_status?.toUpperCase() || 'CONFIRMED'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p className="font-medium text-gray-700 mb-1">Important Information</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Please arrive at least 30 minutes before the scheduled time</li>
                    <li>Carry a valid ID proof for verification</li>
                    <li>This ticket is non-transferable</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-gray-700 mb-1">Contact Support</p>
                  <p>Email: support@tickethub.com</p>
                  <p>Phone: 1800-123-4567</p>
                  <p className="mt-2 text-xs">
                    Booked on {formatDate(booking.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none, .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:py-0 {
            padding-top: 0;
            padding-bottom: 0;
          }
          .print\\:border-none {
            border: none;
          }
          .print\\:pl-0 {
            padding-left: 0;
          }
          .print\\:bg-indigo-600 {
            background-color: #4f46e5;
          }
        }
      `}</style>
    </div>
  );
};

export default TicketView;

