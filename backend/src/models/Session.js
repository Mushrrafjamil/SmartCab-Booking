const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refreshToken: { type: String, required: true },
  deviceName: String,
  browser: String,
  os: String,
  ipAddress: String,
  location: String,
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now },
  logoutAt: Date,
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

SessionSchema.index({ userId: 1, isActive: 1 });
SessionSchema.index({ refreshToken: 1 });

module.exports = mongoose.model('Session', SessionSchema);
