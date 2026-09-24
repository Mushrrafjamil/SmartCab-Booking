const Coupon = require('../models/Coupon');

exports.createCoupon = async (req, res, next) => {
  try {
    const { code, discountPercentage, maxDiscount, minRideValue, expiryDate } = req.body;
    if (!code || !discountPercentage || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Please provide coupon code, discount percentage, and expiry date' });
    }

    const couponExists = await Coupon.findOne({ code: code.toUpperCase() });
    if (couponExists) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountPercentage,
      maxDiscount: maxDiscount || 100,
      minRideValue: minRideValue || 0,
      expiryDate: new Date(expiryDate),
      isActive: true
    });

    res.status(201).json({ success: true, message: 'Coupon created successfully', coupon });
  } catch (error) {
    next(error);
  }
};

exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, rideValue } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required' });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found or is inactive' });
    }

    if (coupon.expiryDate < new Date()) {
      return res.status(400).json({ success: false, message: 'Coupon has expired' });
    }

    if (rideValue && rideValue < coupon.minRideValue) {
      return res.status(400).json({ success: false, message: `Minimum ride amount to apply this coupon is ₹${coupon.minRideValue}` });
    }

    res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      coupon: {
        code: coupon.code,
        discountPercentage: coupon.discountPercentage,
        maxDiscount: coupon.maxDiscount,
        minRideValue: coupon.minRideValue
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getActiveCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find({ isActive: true, expiryDate: { $gt: new Date() } });
    res.status(200).json({ success: true, coupons });
  } catch (error) {
    next(error);
  }
};

exports.getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (error) {
    next(error);
  }
};

exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, coupon });
  } catch (error) {
    next(error);
  }
};

exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
    res.json({ success: true, message: 'Coupon deactivated' });
  } catch (error) {
    next(error);
  }
};
