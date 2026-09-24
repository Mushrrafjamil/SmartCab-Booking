const mongoose = require('mongoose');

const LocationDetailsSchema = new mongoose.Schema({
  address: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
});

const FareDetailsSchema = new mongoose.Schema({
  baseFare: { type: Number, required: true },
  distanceCharge: { type: Number, required: true },
  timeCharge: { type: Number, required: true },
  nightCharge: { type: Number, default: 0 },
  peakCharge: { type: Number, default: 0 },
  tollTax: { type: Number, default: 0 },
  waitingCharge: { type: Number, default: 0 },
  surgeCharge: { type: Number, default: 0 },
  surgeMultiplier: { type: Number, default: 1 },
  gst: { type: Number, required: true },
  couponDiscount: { type: Number, default: 0 },
  finalFare: { type: Number, required: true },
});

const ReviewSchema = new mongoose.Schema({
  rating: { type: Number, min: 1, max: 5 },
  comment: { type: String, default: '' },
  issueReported: { type: Boolean, default: false },
});

const RideSchema = new mongoose.Schema({
  rideId: { type: String, unique: true, sparse: true },
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  pendingDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  vehicleType: { type: String, default: 'sedan' },
  rejectedDrivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }],
  assignmentAttempts: { type: Number, default: 0 },
  assignmentExpiresAt: { type: Date },
  assignedBy: { type: String, enum: ['system', 'admin', 'dispatcher', ''], default: '' },
  pickup: { type: LocationDetailsSchema, required: true },
  destination: { type: LocationDetailsSchema, required: true },
  stops: [LocationDetailsSchema],
  distance: { type: Number, required: true },
  duration: { type: Number, required: true },
  etaMinutes: { type: Number },
  status: {
    type: String,
    enum: ['pending', 'searching', 'assigned', 'arrived', 'started', 'completed', 'cancelled', 'scheduled'],
    default: 'pending',
  },
  isScheduled: { type: Boolean, default: false },
  scheduledAt: { type: Date },
  fareDetails: { type: FareDetailsSchema, required: true },
  couponCode: { type: String, default: '' },
  paymentMethod: { type: String, enum: ['cash', 'wallet', 'upi', 'card', 'credit_card'], default: 'cash' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  driverRating: { type: ReviewSchema, default: null },
  passengerRating: { type: ReviewSchema, default: null },
  notes: { type: String, default: '' },
  pickupNotes: { type: String, default: '' },
  dropNotes: { type: String, default: '' },
  landmark: { type: String, default: '' },
  gateNumber: { type: String, default: '' },
  otp: { type: String, required: true },
  driverLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date,
  },
  cancellationReason: { type: String, default: '' },
  cancelledBy: { type: String, enum: ['user', 'driver', 'admin', 'system', ''], default: '' },
  cancellationCharge: { type: Number, default: 0 },
  invoiceNumber: { type: String, default: '' },
}, { timestamps: true });

RideSchema.pre('save', function (next) {
  if (!this.rideId) this.rideId = `RIDE${Date.now()}${Math.floor(Math.random() * 1000)}`;
  next();
});

module.exports = mongoose.model('Ride', RideSchema);
