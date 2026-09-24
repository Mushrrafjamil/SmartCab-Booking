const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  // Step 1 - Personal
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  address: String,
  city: String,
  state: String,
  pincode: String,
  // Step 2 - Identity
  aadhaarNumber: { type: String, unique: true, sparse: true, trim: true },
  aadhaarFront: String,
  aadhaarBack: String,
  panNumber: { type: String, unique: true, sparse: true, trim: true },
  panCardImage: String,
  // Step 3 - License
  licenseNumber: { type: String, unique: true, sparse: true, trim: true },
  licenseExpiry: Date,
  licenseFront: String,
  licenseBack: String,
  // Step 4 - Vehicle (basic, full in Vehicle model)
  vehicleType: String,
  vehicleBrand: String,
  vehicleModel: String,
  vehicleNumber: String,
  vehicleColor: String,
  manufacturingYear: Number,
  // Step 5 - Vehicle Documents
  rcBook: String,
  insuranceCertificate: String,
  pollutionCertificate: String,
  fitnessCertificate: String,
  vehicleImages: [String],
  // Step 6 - Profile & Bank
  profilePhoto: String,
  selfieVerification: String,
  emergencyContact: { name: String, phone: String, relation: String },
  bankAccount: String,
  ifscCode: String,
  upiId: String,
  // Step 7 - Verification
  registrationStep: { type: Number, default: 1, min: 1, max: 7 },
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
    default: 'pending',
  },
  adminRemarks: String,
  status: { type: String, enum: ['online', 'offline', 'busy'], default: 'offline' },
  currentLocation: { lat: { type: Number, default: 0 }, lng: { type: Number, default: 0 } },
  rating: { type: Number, default: 5 },
  ratingCount: { type: Number, default: 0 },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Driver', DriverSchema);
