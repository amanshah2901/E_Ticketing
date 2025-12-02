import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle,
  Eye,
  DollarSign
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/utils'

const AdminRefunds = ({ refunds = [], onApprove, onReject, onView }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch = 
      refund.booking_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.user_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'approved': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      case 'processed': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Mock data - in real app, this would come from API
  const mockRefunds = [
    {
      id: 1,
      booking_reference: 'BK123456789',
      user_name: 'John Doe',
      user_email: 'john@example.com',
      item_title: 'Avatar: The Way of Water',
      booking_type: 'movie',
      amount: 350,
      refund_amount: 315,
      status: 'pending',
      request_date: new Date('2024-01-15'),
      reason: 'Change of plans'
    },
    {
      id: 2,
      booking_reference: 'BK987654321',
      user_name: 'Jane Smith',
      user_email: 'jane@example.com',
      item_title: 'Mumbai to Pune Bus',
      booking_type: 'bus',
      amount: 800,
      refund_amount: 720,
      status: 'approved',
      request_date: new Date('2024-01-14'),
      reason: 'Emergency situation'
    }
  ]

  const data = refunds.length > 0 ? refunds : mockRefunds

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund Management</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by reference or user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Refunds List */}
        <div className="space-y-4">
          {filteredRefunds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No refund requests found
            </div>
          ) : (
            filteredRefunds.map((refund) => (
              <Card key={refund.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold">{refund.booking_reference}</h3>
                      <Badge className={getStatusColor(refund.status)}>
                        {refund.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">User</div>
                        <div>{refund.user_name}</div>
                        <div className="text-gray-500">{refund.user_email}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-600">Booking</div>
                        <div className="capitalize">{refund.booking_type}</div>
                        <div className="text-gray-500 line-clamp-1">{refund.item_title}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-600">Amounts</div>
                        <div>Paid: {formatCurrency(refund.amount)}</div>
                        <div>Refund: {formatCurrency(refund.refund_amount)}</div>
                      </div>
                      
                      <div>
                        <div className="text-gray-600">Request</div>
                        <div>{formatDate(refund.request_date)}</div>
                        <div className="text-gray-500">{refund.reason}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(refund)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    {refund.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-600"
                          onClick={() => onApprove(refund)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => onReject(refund)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Refund Statistics */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Refund Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {data.filter(r => r.status === 'pending').length}
                </div>
                <div className="text-sm text-blue-600">Pending</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {data.filter(r => r.status === 'approved').length}
                </div>
                <div className="text-sm text-green-600">Approved</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {data.filter(r => r.status === 'rejected').length}
                </div>
                <div className="text-sm text-red-600">Rejected</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(data.reduce((sum, refund) => sum + refund.refund_amount, 0))}
                </div>
                <div className="text-sm text-purple-600">Total Refunds</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

export default AdminRefunds