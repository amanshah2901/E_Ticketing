import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import BookingSummary from '@/components/booking/BookingSummary';
import { trainsAPI } from '@/api/services';
import { formatCurrency, formatDate } from '@/utils';
import { Calendar, Clock, MapPin, Users, Train, Star } from 'lucide-react';

const TrainBooking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [train, setTrain] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [passengerDetails, setPassengerDetails] = useState([{ name: '', age: '', gender: '', phone: '' }]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  const trainId = searchParams.get('id');

  useEffect(() => {
    if (!user) {
      navigate('/login?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    fetchTrainDetails();
  }, [trainId, user, navigate]);

  const fetchTrainDetails = async () => {
    try {
      setLoading(true);
      const trainData = await trainsAPI.getTrainById(trainId);
      setTrain(trainData);
      if (trainData.classes && trainData.classes.length > 0) {
        setSelectedClass(trainData.classes[0].class_type);
      }
    } catch (error) {
      console.error('Error fetching train details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quantity > passengerDetails.length) {
      const newDetails = [...passengerDetails];
      while (newDetails.length < quantity) {
        newDetails.push({ name: '', age: '', gender: '', phone: '' });
      }
      setPassengerDetails(newDetails);
    } else if (quantity < passengerDetails.length) {
      setPassengerDetails(passengerDetails.slice(0, quantity));
    }
  }, [quantity]);

  const updatePassengerDetail = (index, field, value) => {
    const newDetails = [...passengerDetails];
    newDetails[index][field] = value;
    setPassengerDetails(newDetails);
  };

  const calculateTotal = () => {
    if (!train || !selectedClass) return 0;
    
    const trainClass = train.classes.find(c => c.class_type === selectedClass);
    if (!trainClass) return 0;
    
    const subtotal = trainClass.price * quantity;
    const bookingFee = subtotal * 0.05;
    const tax = subtotal * 0.05;
    
    return subtotal + bookingFee + tax;
  };

  const handleContinue = () => {
    if (step === 1 && !selectedClass) {
      alert('Please select a class');
      return;
    }
    
    if (step === 2) {
      for (let i = 0; i < passengerDetails.length; i++) {
        const passenger = passengerDetails[i];
        if (!passenger.name || !passenger.age || !passenger.gender) {
          alert(`Please fill all details for passenger ${i + 1}`);
          return;
        }
      }
    }

    if (step === 3) {
      const trainClass = train.classes.find(c => c.class_type === selectedClass);
      const bookingData = {
        booking_type: 'train',
        item_id: trainId,
        quantity: quantity,
        class_type: selectedClass,
        passenger_details: passengerDetails,
        total_amount: calculateTotal(),
        item: train,
        basePrice: trainClass.price,
        eventDate: train.departure_date,
        eventTime: train.departure_time,
        venue: `${train.from_station} (${train.from_station_code}) → ${train.to_station} (${train.to_station_code})`
      };
      
      navigate('/payment', { state: { bookingData } });
      return;
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading train details...</p>
        </div>
      </div>
    );
  }

  if (!train) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Train not found</h1>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const selectedClassData = train.classes.find(c => c.class_type === selectedClass);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Train Booking</h1>
          <p className="text-gray-600">Book your train tickets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{train.train_name} ({train.train_number})</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <Badge variant="outline" className="capitalize">
                        {train.train_type.replace(/_/g, ' ')}
                      </Badge>
                      <span>•</span>
                      <span>{train.operator}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">From</p>
                      <p className="font-semibold">{train.from_station} ({train.from_station_code})</p>
                      <p className="text-sm text-gray-600">{formatDate(train.departure_date)} at {train.departure_time}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600">To</p>
                      <p className="font-semibold">{train.to_station} ({train.to_station_code})</p>
                      <p className="text-sm text-gray-600">{formatDate(train.arrival_date)} at {train.arrival_time}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Class</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {train.classes.map((trainClass) => (
                      <div
                        key={trainClass.class_type}
                        onClick={() => setSelectedClass(trainClass.class_type)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedClass === trainClass.class_type
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold">{trainClass.class_type}</h3>
                            <p className="text-sm text-gray-600">
                              {trainClass.available_seats} seats available
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-green-600">
                              {formatCurrency(trainClass.price)}
                            </div>
                            <div className="text-sm text-gray-600">per ticket</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedClass && (
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Tickets
                      </label>
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
                          onClick={() => setQuantity(Math.min(selectedClassData.available_seats, quantity + 1))}
                          disabled={quantity >= selectedClassData.available_seats}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Passenger Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {passengerDetails.map((passenger, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-3">Passenger {index + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name *
                            </label>
                            <Input
                              value={passenger.name}
                              onChange={(e) => updatePassengerDetail(index, 'name', e.target.value)}
                              placeholder="Full name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Age *
                            </label>
                            <Input
                              type="number"
                              value={passenger.age}
                              onChange={(e) => updatePassengerDetail(index, 'age', e.target.value)}
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
                              value={passenger.gender}
                              onChange={(e) => updatePassengerDetail(index, 'gender', e.target.value)}
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
                              Phone
                            </label>
                            <Input
                              value={passenger.phone}
                              onChange={(e) => updatePassengerDetail(index, 'phone', e.target.value)}
                              placeholder="Phone number"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Booking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Booking Summary</h4>
                      <div className="flex justify-between">
                        <span>{quantity} {quantity === 1 ? 'Ticket' : 'Tickets'} - {selectedClass}</span>
                        <span className="font-semibold">{formatCurrency(selectedClassData.price * quantity)}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Passenger Details</h4>
                      <div className="space-y-2">
                        {passengerDetails.map((passenger, i) => (
                          <div key={i} className="p-3 bg-gray-50 rounded-lg">
                            <div className="font-medium">Passenger {i + 1}</div>
                            <div className="text-sm text-gray-600">
                              {passenger.name}, {passenger.age} years, {passenger.gender}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
              )}
              <Button onClick={handleContinue} className="flex-1">
                {step === 3 ? 'Proceed to Payment' : 'Continue'}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            <BookingSummary
              bookingData={{
                item: train,
                quantity: quantity,
                passengerDetails: passengerDetails,
                totalAmount: calculateTotal(),
                basePrice: selectedClassData?.price || 0,
                bookingFee: (selectedClassData?.price || 0) * quantity * 0.05,
                tax: (selectedClassData?.price || 0) * quantity * 0.05,
                eventDate: train.departure_date,
                eventTime: train.departure_time,
                venue: `${train.from_station} (${train.from_station_code}) → ${train.to_station} (${train.to_station_code})`
              }}
              type="train"
              showActions={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainBooking;



