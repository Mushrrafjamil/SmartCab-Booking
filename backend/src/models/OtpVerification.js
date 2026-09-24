const mongoose = require('mongoose');

const OtpVerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email: String,
  phone: String,
  otpHash: { type: String, required: true },
  type: { type: String, enum: ['email', 'phone', 'password_reset', 'phone_update', 'email_update'], required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  isUsed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

OtpVerificationSchema.index({ email: 1, type: 1 });
OtpVerificationSchema.index({ phone: 1, type: 1 });
OtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OtpVerification', OtpVerificationSchema);
