const Ride = require('../models/Ride.model');
const Payment = require('../models/Payment.model');
const Coupon = require('../models/Coupon.model');
const { calculateFare, isNightTime, isPeakHour } = require('../utils/fareCalculator');
const { findNearestDrivers } = require('../utils/driverMatcher');

const estimateFare = async (req, res) => {
  try {
    const { distance, duration, vehicleType, couponCode } = req.body;
    let couponDiscount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true, expiryDate: { $gt: new Date() } });
      if (coupon) {
        const subtotal = calculateFare({ distanceKm: distance, durationMin: duration, vehicleType, isNight: isNightTime(), isPeak: isPeakHour() }).total;
        couponDiscount = coupon.discountType === 'percentage'
          ? Math.min(subtotal * coupon.discountValue / 100, coupon.maxDiscount || Infinity)
          : coupon.discountValue;
      }
    }
    const fare = calculateFare({
      distanceKm: distance,
      durationMin: duration,
      vehicleType,
      isNight: isNightTime(),
      isPeak: isPeakHour(),
      couponDiscount,
    });
    res.json({ success: true, data: fare });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bookRide = async (req, res) => {
  try {
    const { pickup, destination, vehicleType, paymentMethod, isScheduled, scheduledAt, notes, couponCode, distance, duration } = req.body;
    let coupon = null;
    let couponDiscount = 0;
    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon) couponDiscount = coupon.discountValue;
    }
    const fare = calculateFare({
      distanceKm: distance,
      durationMin: duration,
      vehicleType,
      isNight: isNightTime(),
      isPeak: isPeakHour(),
      couponDiscount,
    });
    const ride = await Ride.create({
      user: req.user._id,
      pickup,
      destination,
      vehicleType,
      paymentMethod,
      isScheduled,
      scheduledAt,
      notes,
      coupon: coupon?._id,
      distance,
      duration,
      fare,
      status: isScheduled ? 'pending' : 'searching_driver',
    });
    if (!isScheduled && pickup?.latitude && pickup?.longitude) {
      const nearbyDrivers = await findNearestDrivers(pickup.latitude, pickup.longitude, vehicleType);
      ride.nearbyDrivers = nearbyDrivers.length;
    }
    res.status(201).json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('user driver vehicle payment coupon');
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const trackRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate({ path: 'driver', populate: { path: 'user', select: 'fullName phone profilePhoto' } })
      .populate('vehicle');
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateRideStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const updates = { status };
    if (status === 'ride_started') updates.startedAt = new Date();
    if (status === 'ride_completed') updates.completedAt = new Date();
    const ride = await Ride.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', cancelledBy: req.user.role === 'driver' ? 'driver' : 'user', cancellationReason: req.body.reason },
      { new: true }
    );
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const assignDriver = async (req, res) => {
  try {
    const { driverId, vehicleId } = req.body;
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { driver: driverId, vehicle: vehicleId, status: 'driver_assigned' },
      { new: true }
    );
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateDriverLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { driverLocation: { latitude, longitude, updatedAt: new Date() } },
      { new: true }
    );
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllRides = async (req, res) => {
  try {
    const rides = await Ride.find().populate('user driver vehicle').sort({ createdAt: -1 });
    res.json({ success: true, data: rides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  estimateFare,
  bookRide,
  getRide,
  trackRide,
  updateRideStatus,
  cancelRide,
  assignDriver,
  updateDriverLocation,
  getAllRides,
};
