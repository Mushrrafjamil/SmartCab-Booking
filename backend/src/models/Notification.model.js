const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['ride_update', 'payment_update', 'promotional', 'system'],
      default: 'system',
    },
    data: mongoose.Schema.Types.Mixed,
    isRead: { type: Boolean, default: false },
    channel: { type: String, enum: ['push', 'sms', 'email', 'in_app'], default: 'in_app' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
