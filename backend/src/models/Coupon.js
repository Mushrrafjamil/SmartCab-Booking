const mongoose = require('mongoose');

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountPercentage: { type: Number, required: true, min: 0, max: 100 },
  maxDiscount: { type: Number, required: true, default: 100 }, // Maximum cap
  minRideValue: { type: Number, required: true, default: 0 }, // Minimum booking amount
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', CouponSchema);
