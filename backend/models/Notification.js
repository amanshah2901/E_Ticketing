import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot be more than 1000 characters']
  },
  type: {
    type: String,
    enum: ['booking', 'payment', 'refund', 'cancellation', 'reminder', 'promotion', 'system', 'alert'],
    required: [true, 'Type is required']
  },
  is_read: {
    type: Boolean,
    default: false
  },
  is_important: {
    type: Boolean,
    default: false
  },
  booking_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  action_url: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    default: 'bell',
    trim: true
  },
  image_url: {
    type: String,
    default: null
  },
  expires_at: {
    type: Date,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ user_id: 1, created_at: -1 });
notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ is_important: 1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('is_expired').get(function() {
  return this.expires_at && this.expires_at < new Date();
});

// Virtual for formatted date
notificationSchema.virtual('formatted_date').get(function() {
  const now = new Date();
  const diffMs = now - this.created_at;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return this.created_at.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.is_read = true;
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(userId, data) {
  const notification = new this({
    user_id: userId,
    ...data
  });
  return await notification.save();
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    user_id: userId,
    is_read: false
  });
};

export default mongoose.model('Notification', notificationSchema);