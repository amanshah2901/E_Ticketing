import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Film, 
  Bus, 
  Music, 
  Mountain,
  Star,
  MapPin,
  Calendar,
  Clock,
  Users
} from 'lucide-react'
import { moviesAPI, busesAPI, eventsAPI, toursAPI } from '@/api/services'
import { formatCurrency, formatDate } from '@/utils'

const Home = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [featuredMovies, setFeaturedMovies] = useState([])
  const [popularBuses, setPopularBuses] = useState([])
  const [featuredEvents, setFeaturedEvents] = useState([])
  const [featuredTours, setFeaturedTours] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedContent()
  }, [])

  const fetchFeaturedContent = async () => {
    try {
      setLoading(true)
      const [movies, buses, events, tours] = await Promise.all([
        moviesAPI.getFeaturedMovies(),
        busesAPI.getPopularRoutes(),
        eventsAPI.getFeaturedEvents(),
        toursAPI.getFeaturedTours()
      ])

      setFeaturedMovies(movies.movies || [])
      setPopularBuses(buses.buses || [])
      setFeaturedEvents(events.events || [])
      setFeaturedTours(tours.tours || [])
    } catch (error) {
      console.error('Error fetching featured content:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
    }
  }

  const FeaturedCard = ({ item, type, icon: Icon }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300"
    >
      <div className="relative">
        <img 
          src={item.poster_url || item.image_url || '/default-image.jpg'} 
          alt={item.title}
          className="w-full h-48 object-cover"
        />
        <Badge className="absolute top-3 left-3 bg-black/70 text-white border-0">
          <Icon className="w-3 h-3 mr-1" />
          {type}
        </Badge>
        {type === 'movie' && item.imdb_rating && (
          <Badge className="absolute top-3 right-3 bg-yellow-500 text-white border-0">
            <Star className="w-3 h-3 mr-1 fill-current" />
            {item.imdb_rating}
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{item.title}</h3>
        
        <div className="space-y-2 text-sm text-gray-600">
          {type === 'movie' && (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(item.show_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{item.show_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{item.theater}</span>
              </div>
            </>
          )}

          {type === 'bus' && (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{item.from_city} → {item.to_city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{item.departure_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{item.available_seats} seats left</span>
              </div>
            </>
          )}

          {type === 'event' && (
            <>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(item.event_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{item.venue}, {item.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{item.available_tickets} tickets left</span>
              </div>
            </>
          )}

          {type === 'tour' && (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{item.destination}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{item.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{item.available_slots} slots left</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-lg font-bold text-green-600">
            {formatCurrency(type === 'tour' ? item.price_per_person : item.price)}
          </span>
          <Button asChild>
            <Link to={`/${type}-booking?id=${item._id || item.id}`}>
              Book Now
            </Link>
          </Button>
        </div>
      </CardContent>
    </motion.div>
  )

  const Section = ({ title, subtitle, children, viewAllLink }) => (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
          </div>
          {viewAllLink && (
            <Button variant="outline" asChild>
              <Link to={viewAllLink}>
                View All
              </Link>
            </Button>
          )}
        </div>
        {children}
      </div>
    </section>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading featured content...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-bold mb-6"
            >
              Book Your Perfect
              <span className="block bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                Experience
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-xl md:text-2xl mb-8 text-gray-200 max-w-3xl mx-auto"
            >
              Movies, Buses, Events, and Tours - All in one place. Your journey starts here.
            </motion.p>

            {/* Search Bar */}
            <motion.form 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onSubmit={handleSearch}
              className="max-w-2xl mx-auto"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search for movies, buses, events, tours..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-32 py-4 text-lg bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-gray-300 focus:bg-white/20 focus:border-white/40"
                />
                <Button 
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white text-indigo-700 hover:bg-gray-100"
                >
                  Search
                </Button>
              </div>
            </motion.form>

            {/* Quick Categories */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap justify-center gap-4 mt-8"
            >
              {[
                { icon: Film, label: 'Movies', href: '/search?type=movie' },
                { icon: Bus, label: 'Buses', href: '/search?type=bus' },
                { icon: Music, label: 'Events', href: '/search?type=event' },
                { icon: Mountain, label: 'Tours', href: '/search?type=tour' }
              ].map((item, index) => (
                <Button
                  key={item.label}
                  asChild
                  variant="outline"
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <Link to={item.href}>
                    <item.icon className="w-5 h-5 mr-2" />
                    {item.label}
                  </Link>
                </Button>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Movies */}
      {featuredMovies.length > 0 && (
        <Section 
          title="Featured Movies" 
          subtitle="Blockbusters and latest releases"
          viewAllLink="/search?type=movie"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredMovies.map((movie, index) => (
              <FeaturedCard 
                key={movie._id || movie.id} 
                item={movie} 
                type="movie"
                icon={Film}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Popular Bus Routes */}
      {popularBuses.length > 0 && (
        <Section 
          title="Popular Bus Routes" 
          subtitle="Most traveled routes with great deals"
          viewAllLink="/search?type=bus"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularBuses.slice(0, 4).map((bus, index) => (
              <FeaturedCard 
                key={bus._id || bus.id} 
                item={bus} 
                type="bus"
                icon={Bus}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Featured Events */}
      {featuredEvents.length > 0 && (
        <Section 
          title="Upcoming Events" 
          subtitle="Concerts, sports, and entertainment"
          viewAllLink="/search?type=event"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredEvents.map((event, index) => (
              <FeaturedCard 
                key={event._id || event.id} 
                item={event} 
                type="event"
                icon={Music}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Featured Tours */}
      {featuredTours.length > 0 && (
        <Section 
          title="Adventure Tours" 
          subtitle="Explore amazing destinations"
          viewAllLink="/search?type=tour"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredTours.map((tour, index) => (
              <FeaturedCard 
                key={tour._id || tour.id} 
                item={tour} 
                type="tour"
                icon={Mountain}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose TicketHub?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We make booking experiences seamless and enjoyable
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🎯',
                title: 'All-in-One Platform',
                description: 'Book movies, buses, events, and tours from a single platform'
              },
              {
                icon: '⚡',
                title: 'Instant Confirmation',
                description: 'Get immediate booking confirmation with digital tickets'
              },
              {
                icon: '🛡️',
                title: 'Secure Payments',
                description: 'Multiple payment options with bank-level security'
              },
              {
                icon: '📱',
                title: 'Mobile Friendly',
                description: 'Book on the go with our mobile-optimized platform'
              },
              {
                icon: '💬',
                title: '24/7 Support',
                description: 'Round-the-clock customer support for all your queries'
              },
              {
                icon: '💰',
                title: 'Best Prices',
                description: 'Competitive pricing with no hidden charges'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-200"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home