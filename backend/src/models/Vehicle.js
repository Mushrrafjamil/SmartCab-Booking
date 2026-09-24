const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  vehicleNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['mini', 'sedan', 'suv', 'luxury', 'auto', 'bike', 'xl', 'premium', 'electric'], default: 'sedan' },
  brand: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
  seatingCapacity: { type: Number, required: true, default: 4 },
  fuelType: { type: String, enum: ['petrol', 'diesel', 'cng', 'electric'], default: 'petrol' },
  insuranceNumber: { type: String, required: true, trim: true },
  rcBookNumber: { type: String, required: true, trim: true },
  pollutionCertificate: { type: String, default: '' },
  insuranceExpiry: { type: Date },
  fitnessExpiry: { type: Date },
  isActive: { type: Boolean, default: true },
  verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  status: { type: String, enum: ['available', 'busy', 'maintenance', 'offline'], default: 'offline' }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);
