const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    vehicleNumber: { type: String, required: true, unique: true },
    vehicleType: {
      type: String,
      enum: ['mini', 'sedan', 'suv', 'premium', 'auto'],
      required: true,
    },
    brand: String,
    model: String,
    color: String,
    seatingCapacity: { type: Number, default: 4 },
    fuelType: { type: String, enum: ['petrol', 'diesel', 'cng', 'electric'], default: 'petrol' },
    rcBook: String,
    insurance: String,
    pollutionCertificate: String,
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['available', 'busy', 'maintenance', 'offline'],
      default: 'offline',
    },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('Vehicle', vehicleSchema);
