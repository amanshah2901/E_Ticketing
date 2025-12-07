import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { searchAPI } from '@/api/services';
import { formatCurrency, formatDate } from '@/utils';
import { Bus, Train, Plane, Calendar, MapPin, Clock, Users, Search } from 'lucide-react';

const TransportSearch = () => {
  const navigate = useNavigate();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ buses: [], trains: [], flights: [] });

  const handleSearch = async () => {
    if (!from || !to || !date) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Searching transport with:', { from, to, date, type });
      const data = await searchAPI.searchTransport({ from, to, date, type });
      console.log('Search results:', data);
      setResults(data || { buses: [], trains: [], flights: [] });
      
      // Show message if no results
      const totalResults = (data?.buses?.length || 0) + (data?.trains?.length || 0) + (data?.flights?.length || 0);
      if (totalResults === 0) {
        alert('No transport options found for your search. Please try different cities or dates.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching transport: ' + (error?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const ResultCard = ({ item, transportType }) => {
    const isBus = transportType === 'bus';
    const isTrain = transportType === 'train';
    const isFlight = transportType === 'flight';

    const handleBook = () => {
      if (isBus) {
        navigate(`/bus-booking?id=${item._id}`);
      } else if (isTrain) {
        navigate(`/train-booking?id=${item._id}`);
      } else if (isFlight) {
        navigate(`/flight-booking?id=${item._id}`);
      }
    };

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-48 h-32 md:h-auto">
              <img
                src={item.image_url || (isBus ? '/default-bus-image.jpg' : isTrain ? '/default-train-image.jpg' : '/default-flight-image.jpg')}
                alt={isBus ? item.operator : isTrain ? item.train_name : item.airline}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-xl font-semibold mb-1">
                    {isBus ? item.operator : isTrain ? `${item.train_name} (${item.train_number})` : `${item.airline} ${item.flight_number}`}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {isBus ? `${item.from_city} → ${item.to_city}` : 
                       isTrain ? `${item.from_station} (${item.from_station_code}) → ${item.to_station} (${item.to_station_code})` :
                       `${item.from_airport} (${item.from_airport_code}) → ${item.to_airport} (${item.to_airport_code})`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {isBus ? formatCurrency(item.price) : 
                     isTrain ? formatCurrency(item.classes?.[0]?.price || 0) :
                     formatCurrency(item.classes?.[0]?.price || 0)}
                  </div>
                  <Badge variant="outline" className="mt-1">
                    {isBus ? 'Bus' : isTrain ? 'Train' : 'Flight'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(item.departure_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{item.departure_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{item.arrival_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>
                    {isBus ? `${item.available_seats} seats` : 
                     isTrain ? `${item.classes?.[0]?.available_seats || 0} seats` :
                     `${item.classes?.[0]?.available_seats || 0} seats`}
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <Button onClick={handleBook} className="w-full md:w-auto">
                  Book Now
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Transport</h1>
          <p className="text-gray-600">Find buses, trains, and flights</p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From
                </label>
                <Input
                  placeholder="e.g., Mumbai, Delhi, Bangalore"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Try: Mumbai, Delhi, Bangalore, Chennai, Pune, Kolkata</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <Input
                  placeholder="e.g., Mumbai, Delhi, Bangalore"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Try: Mumbai, Delhi, Bangalore, Chennai, Pune, Kolkata</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={loading} className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <Tabs value={type} onValueChange={setType}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="bus">
                    <Bus className="w-4 h-4 mr-2" />
                    Buses
                  </TabsTrigger>
                  <TabsTrigger value="train">
                    <Train className="w-4 h-4 mr-2" />
                    Trains
                  </TabsTrigger>
                  <TabsTrigger value="flight">
                    <Plane className="w-4 h-4 mr-2" />
                    Flights
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {type === 'all' || type === 'bus' ? (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Bus className="w-6 h-6" />
                  Buses ({results.buses?.length || 0})
                </h2>
                {results.buses?.length > 0 ? (
                  <div className="space-y-4">
                    {results.buses.map((bus) => (
                      <ResultCard key={bus._id} item={bus} transportType="bus" />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No buses found</p>
                )}
              </div>
            ) : null}

            {type === 'all' || type === 'train' ? (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Train className="w-6 h-6" />
                  Trains ({results.trains?.length || 0})
                </h2>
                {results.trains?.length > 0 ? (
                  <div className="space-y-4">
                    {results.trains.map((train) => (
                      <ResultCard key={train._id} item={train} transportType="train" />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No trains found</p>
                )}
              </div>
            ) : null}

            {type === 'all' || type === 'flight' ? (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Plane className="w-6 h-6" />
                  Flights ({results.flights?.length || 0})
                </h2>
                {results.flights?.length > 0 ? (
                  <div className="space-y-4">
                    {results.flights.map((flight) => (
                      <ResultCard key={flight._id} item={flight} transportType="flight" />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No flights found</p>
                )}
              </div>
            ) : null}

            {results.buses?.length === 0 && results.trains?.length === 0 && results.flights?.length === 0 && !loading && from && to && date && (
              <div className="text-center py-12">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600 mb-4">Try adjusting your search criteria</p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p><strong>Popular routes to try:</strong></p>
                  <p>Mumbai → Delhi | Delhi → Mumbai | Bangalore → Chennai</p>
                  <p>Mumbai → Pune | Delhi → Bangalore | Chennai → Bangalore</p>
                  <p className="mt-2 text-xs">Make sure the date is in the future and matches available routes</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportSearch;



