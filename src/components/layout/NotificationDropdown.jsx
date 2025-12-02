import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  Check, 
  Trash2, 
  Settings,
  Ticket,
  DollarSign,
  AlertTriangle,
  Info
} from 'lucide-react'
import { formatDate } from '@/utils'

const NotificationDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // Mock notifications - in real app, these would come from API
  const mockNotifications = [
    {
      id: 1,
      title: 'Booking Confirmed!',
      message: 'Your booking for Avatar: The Way of Water has been confirmed.',
      type: 'booking',
      is_read: false,
      created_at: new Date('2024-01-20T10:30:00'),
      action_url: '/bookings/1',
      icon: 'check-circle'
    },
    {
      id: 2,
      title: 'Payment Successful',
      message: 'Payment of ₹350 for your movie booking has been processed.',
      type: 'payment',
      is_read: false,
      created_at: new Date('2024-01-20T10:25:00'),
      action_url: '/payments/1',
      icon: 'dollar-sign'
    },
    {
      id: 3,
      title: 'Wallet Recharged',
      message: 'Your wallet has been recharged with ₹1000. New balance: ₹1500.',
      type: 'wallet',
      is_read: true,
      created_at: new Date('2024-01-19T15:45:00'),
      action_url: '/profile?tab=wallet',
      icon: 'wallet'
    },
    {
      id: 4,
      title: 'System Maintenance',
      message: 'Scheduled maintenance on January 25th, 2024 from 2:00 AM to 4:00 AM.',
      type: 'system',
      is_read: true,
      created_at: new Date('2024-01-18T09:00:00'),
      icon: 'info'
    }
  ]

  useEffect(() => {
    // In real app, fetch notifications from API
    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter(n => !n.is_read).length)
  }, [])

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'check-circle': return <Ticket className="w-5 h-5 text-green-600" />
      case 'dollar-sign': return <DollarSign className="w-5 h-5 text-blue-600" />
      case 'wallet': return <DollarSign className="w-5 h-5 text-purple-600" />
      case 'alert-triangle': return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default: return <Info className="w-5 h-5 text-gray-600" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'booking': return 'bg-green-100 text-green-800'
      case 'payment': return 'bg-blue-100 text-blue-800'
      case 'wallet': return 'bg-purple-100 text-purple-800'
      case 'system': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
    setUnreadCount(prev => 
      notifications.find(n => n.id === notificationId && !n.is_read) 
        ? prev - 1 
        : prev
    )
  }

  const clearAll = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  if (!user) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative text-white hover:bg-white/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white border-0"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50"
          >
            {/* Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Mark all read
                    </Button>
                  )}
                  {notifications.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="text-xs text-red-600"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear all
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="max-h-96">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No notifications</p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-3 rounded-lg mb-2 transition-colors ${
                        notification.is_read 
                          ? 'bg-gray-50' 
                          : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0">
                          {getIcon(notification.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className={`font-medium text-sm ${
                              notification.is_read ? 'text-gray-700' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h4>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getTypeColor(notification.type)}`}
                            >
                              {notification.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatDate(notification.created_at)}
                            </span>
                            <div className="flex items-center gap-1">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600"
                                onClick={() => deleteNotification(notification.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t bg-gray-50 rounded-b-lg">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-sm"
                  onClick={() => {
                    // Navigate to notifications page
                    setIsOpen(false)
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  View All Notifications
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default NotificationDropdown