const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'upi', 'credit_card', 'debit_card', 'wallet', 'net_banking'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    transactionId: String,
    fareBreakdown: {
      baseFare: Number,
      distanceCharge: Number,
      timeCharge: Number,
      nightCharge: Number,
      peakCharge: Number,
      tollTax: Number,
      gst: Number,
      couponDiscount: Number,
      total: Number,
    },
    refundAmount: Number,
    refundReason: String,
    paidAt: Date,
  },
  { timestamps: true }
);

paymentSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    this.invoiceNumber = `INV${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
