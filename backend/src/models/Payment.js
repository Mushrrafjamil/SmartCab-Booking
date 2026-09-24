const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true, required: true },
  transactionId: { type: String, default: '' },
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  amount: { type: Number, required: true },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  couponCode: { type: String, default: '' },
  method: {
    type: String,
    enum: ['cash', 'upi', 'card', 'wallet', 'netbanking', 'credit_card'],
    default: 'cash',
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'refund_pending'],
    default: 'pending',
  },
  fareBreakdown: { type: Object, default: {} },
  invoiceNumber: { type: String, default: '' },
  failureReason: { type: String, default: '' },
  refundReason: { type: String, default: '' },
  refundStatus: { type: String, enum: ['none', 'requested', 'processing', 'completed', 'rejected'], default: 'none' },
  refundedAt: { type: Date },
  verifiedAt: { type: Date },
  paidAt: { type: Date },
}, { timestamps: true });

PaymentSchema.pre('save', function (next) {
  if (!this.paymentId) this.paymentId = `PAY${Date.now()}${Math.floor(Math.random() * 1000)}`;
  if (!this.transactionId) this.transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 10000)}`;
  next();
});

module.exports = mongoose.model('Payment', PaymentSchema);
