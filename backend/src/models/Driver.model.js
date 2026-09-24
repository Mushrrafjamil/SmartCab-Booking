const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    licenseNumber: { type: String, required: true },
    aadhaarNumber: String,
    panNumber: String,
    licenseDocument: String,
    aadhaarDocument: String,
    panDocument: String,
    profileImage: String,
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    backgroundVerified: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    rating: { type: Number, default: 0 },
    totalRides: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    documents: {
      license: String,
      aadhaar: String,
      pan: String,
      rcBook: String,
      insurance: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

driverSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Driver', driverSchema);
