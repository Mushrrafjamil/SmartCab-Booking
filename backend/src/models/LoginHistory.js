const mongoose = require('mongoose');

const LoginHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  loginType: { type: String, enum: ['email', 'phone', 'otp'], default: 'email' },
  deviceName: String,
  browser: String,
  os: String,
  ipAddress: String,
  location: String,
  success: { type: Boolean, default: true },
  failureReason: String,
  logoutAt: Date,
}, { timestamps: true });

LoginHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('LoginHistory', LoginHistorySchema);
