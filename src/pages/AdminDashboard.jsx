import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/AuthContext'
import { adminAPI } from '@/api/services'
import AdminAnalytics from '@/components/admin/AdminAnalytics'
import AdminBookings from '@/components/admin/AdminBookings'
import AdminUsers from '@/components/admin/AdminUsers'
import AdminContent from '@/components/admin/AdminContent'
import AdminRefunds from '@/components/admin/AdminRefunds'
import { 
  TrendingUp, 
  Users, 
  Ticket, 
  DollarSign,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

const AdminDashboard = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getDashboardStats()
      setDashboardData(data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center mt-1 text-sm ${
                change > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {change > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                <span>{Math.abs(change)}% from last month</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full bg-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const { overview = {} } = dashboardData || {}

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your ticketing platform and monitor performance</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={`₹${(overview.total_revenue || 0).toLocaleString()}`}
                change={12.5}
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Total Users"
                value={(overview.total_users || 0).toLocaleString()}
                change={8.2}
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Total Bookings"
                value={(overview.total_bookings || 0).toLocaleString()}
                change={15.3}
                icon={Ticket}
                color="purple"
              />
              <StatCard
                title="Today's Revenue"
                value={`₹${(overview.today_revenue || 0).toLocaleString()}`}
                change={-2.1}
                icon={TrendingUp}
                color="orange"
              />
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Movies</p>
                      <p className="text-2xl font-bold mt-1">{overview.total_movies || 0}</p>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Bus Routes</p>
                      <p className="text-2xl font-bold mt-1">{overview.total_buses || 0}</p>
                    </div>
                    <Badge variant="secondary">Routes</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Upcoming Events</p>
                      <p className="text-2xl font-bold mt-1">{overview.total_events || 0}</p>
                    </div>
                    <Badge variant="outline">Events</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics */}
            {dashboardData && <AdminAnalytics data={dashboardData} />}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <AdminBookings 
              bookings={dashboardData?.recent_activities?.bookings || []}
              onView={(booking) => console.log('View booking:', booking)}
              onEdit={(booking) => console.log('Edit booking:', booking)}
            />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <AdminUsers 
              users={[]}
              onEdit={(user) => console.log('Edit user:', user)}
              onToggleStatus={(user) => console.log('Toggle user status:', user)}
            />
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content">
            <AdminContent />
          </TabsContent>

          {/* Refunds Tab */}
          <TabsContent value="refunds">
            <AdminRefunds 
              refunds={[]}
              onApprove={(refund) => console.log('Approve refund:', refund)}
              onReject={(refund) => console.log('Reject refund:', refund)}
              onView={(refund) => console.log('View refund:', refund)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default AdminDashboard