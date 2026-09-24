const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['ride', 'payment', 'promotional', 'system', 'address'], default: 'system' },
  channel: { type: String, enum: ['push', 'sms', 'email', 'in_app'], default: 'in_app' },
  metadata: { type: Object, default: {} },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
