import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Film,
  Bus,
  Music,
  Mountain
} from 'lucide-react'

const AdminContent = () => {
  const [activeTab, setActiveTab] = useState('movies')
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data - in real app, this would come from API
  const mockData = {
    movies: [
      { id: 1, title: 'Avatar: The Way of Water', genre: 'Sci-Fi', status: 'active', shows: 5, bookings: 120 },
      { id: 2, title: 'Pathaan', genre: 'Action', status: 'active', shows: 8, bookings: 95 },
    ],
    buses: [
      { id: 1, operator: 'Volvo Bus Service', route: 'Mumbai to Pune', status: 'active', seats: 40, bookings: 25 },
      { id: 2, operator: 'Neeta Travels', route: 'Mumbai to Goa', status: 'active', seats: 36, bookings: 18 },
    ],
    events: [
      { id: 1, title: 'Sunburn Festival 2024', category: 'festival', status: 'upcoming', tickets: 5000, sold: 3500 },
      { id: 2, title: 'Comedy Night with Zakir Khan', category: 'comedy', status: 'upcoming', tickets: 800, sold: 450 },
    ],
    tours: [
      { id: 1, title: 'Ladakh Bike Adventure', destination: 'Ladakh', status: 'available', slots: 15, booked: 8 },
    ]
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'movies': return <Film className="w-5 h-5" />
      case 'buses': return <Bus className="w-5 h-5" />
      case 'events': return <Music className="w-5 h-5" />
      case 'tours': return <Mountain className="w-5 h-5" />
      default: return <Film className="w-5 h-5" />
    }
  }

  const ContentTable = ({ data, type }) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Input
            placeholder={`Search ${type}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add {type.slice(0, -1)}
        </Button>
      </div>

      <div className="border rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-4 font-medium">Title/Name</th>
              <th className="text-left p-4 font-medium">Details</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Bookings/Sales</th>
              <th className="text-left p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium">{item.title || item.operator}</div>
                  <div className="text-sm text-gray-500">
                    {item.genre || item.route || item.category || item.destination}
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    {type === 'movies' && `Shows: ${item.shows}`}
                    {type === 'buses' && `Seats: ${item.seats}`}
                    {type === 'events' && `Tickets: ${item.tickets}`}
                    {type === 'tours' && `Slots: ${item.slots}`}
                  </div>
                </td>
                <td className="p-4">
                  <Badge 
                    variant={
                      item.status === 'active' || item.status === 'available' ? 'default' :
                      item.status === 'upcoming' ? 'secondary' : 'destructive'
                    }
                  >
                    {item.status}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    {item.bookings || item.sold || item.booked} / {item.seats || item.tickets || item.slots}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="movies" className="flex items-center gap-2">
              <Film className="w-4 h-4" />
              Movies
            </TabsTrigger>
            <TabsTrigger value="buses" className="flex items-center gap-2">
              <Bus className="w-4 h-4" />
              Buses
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="tours" className="flex items-center gap-2">
              <Mountain className="w-4 h-4" />
              Tours
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="movies">
            <ContentTable data={mockData.movies} type="movies" />
          </TabsContent>
          
          <TabsContent value="buses">
            <ContentTable data={mockData.buses} type="buses" />
          </TabsContent>
          
          <TabsContent value="events">
            <ContentTable data={mockData.events} type="events" />
          </TabsContent>
          
          <TabsContent value="tours">
            <ContentTable data={mockData.tours} type="tours" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default AdminContent