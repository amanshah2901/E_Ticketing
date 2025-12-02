import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import { 
  TrendingUp, 
  Users, 
  Ticket, 
  DollarSign, 
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react'

const AdminAnalytics = ({ data }) => {
  const {
    overview = {},
    monthly_revenue = [],
    by_type = [],
    by_payment_method = []
  } = data || {}

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change && (
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

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthly_revenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="_id" 
                  tickFormatter={(value) => {
                    if (value.month) {
                      return `${value.month}/${value.year.toString().slice(-2)}`
                    }
                    return value.year
                  }}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#0088FE" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              Revenue by Booking Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={by_type}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ _id, revenue }) => `${_id}: ₹${revenue.toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {by_type.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {by_type.map((item, index) => (
                <div key={item._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="capitalize">{item._id}</span>
                    <Badge variant="secondary">{item.bookings}</Badge>
                  </div>
                  <span className="font-semibold">
                    ₹{item.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {by_payment_method.map((item, index) => (
                <div key={item._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="capitalize">{item._id.replace('_', ' ')}</span>
                    <Badge variant="secondary">{item.bookings}</Badge>
                  </div>
                  <span className="font-semibold">
                    ₹{item.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminAnalytics