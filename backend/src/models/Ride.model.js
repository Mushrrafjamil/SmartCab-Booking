const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: String,
  latitude: Number,
  longitude: Number,
});

const rideSchema = new mongoose.Schema(
  {
    rideId: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    pickup: locationSchema,
    destination: locationSchema,
    route: [{ latitude: Number, longitude: Number }],
    distance: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    eta: Number,
    vehicleType: { type: String, enum: ['mini', 'sedan', 'suv', 'premium', 'auto'] },
    fare: {
      baseFare: { type: Number, default: 0 },
      distanceCharge: { type: Number, default: 0 },
      timeCharge: { type: Number, default: 0 },
      nightCharge: { type: Number, default: 0 },
      peakCharge: { type: Number, default: 0 },
      tollTax: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
      couponDiscount: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    status: {
      type: String,
      enum: [
        'pending',
        'searching_driver',
        'driver_assigned',
        'driver_arrived',
        'ride_started',
        'ride_completed',
        'cancelled',
      ],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'credit_card', 'debit_card', 'wallet', 'net_banking'],
      default: 'cash',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    isScheduled: { type: Boolean, default: false },
    scheduledAt: Date,
    notes: String,
    cancelledBy: { type: String, enum: ['user', 'driver', 'admin'] },
    cancellationReason: String,
    startedAt: Date,
    completedAt: Date,
    driverLocation: {
      latitude: Number,
      longitude: Number,
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

rideSchema.pre('save', async function (next) {
  if (!this.rideId) {
    this.rideId = `RIDE${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

module.exports = mongoose.model('Ride', rideSchema);
