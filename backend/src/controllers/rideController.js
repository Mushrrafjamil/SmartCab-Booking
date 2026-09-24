const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Coupon = require('../models/Coupon');
const Transaction = require('../models/Transaction');
const { notifyRideUpdate, notifyPaymentUpdate } = require('../services/notificationService');
const { createPaymentFromRide } = require('../services/paymentService');
const { logActivity } = require('../services/authService');
const { calculateFare, calculateAllVehicleFares } = require('../utils/fareCalculator');
const { getDistanceKm, estimateDurationMinutes } = require('../services/geocodingService');
const { initiateAutoAssignment, acceptAssignment, rejectAssignment } = require('../services/driverAssignmentService');

const normalizeLocation = (loc) => {
  if (!loc) return null;
  const lat = loc.lat ?? loc.latitude;
  const lng = loc.lng ?? loc.longitude;
  return { address: loc.address || loc.fullAddress || '', lat: Number(lat), lng: Number(lng) };
};

const getDistanceBetweenPoints = (lat1, lon1, lat2, lon2) => getDistanceKm(lat1, lon1, lat2, lon2);

const findNearbyDrivers = async (lat, lng, vehicleType, limit = 5) => {
  const drivers = await Driver.find({
    status: 'online',
    verificationStatus: 'approved',
    'currentLocation.lat': { $exists: true },
  }).populate({ path: 'userId', select: 'name phone profilePhoto' }).populate('vehicleId');

  return drivers
    .map((d) => ({
      driver: d,
      distance: getDistanceBetweenPoints(lat, lng, d.currentLocation?.lat || 0, d.currentLocation?.lng || 0),
    }))
    .filter((d) => d.distance <= 15)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};

const applyCoupon = async (couponCode, fareAmount) => {
  if (!couponCode) return { discount: 0, code: '' };
  const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
  if (!coupon || coupon.expiryDate <= new Date() || fareAmount < coupon.minRideValue) {
    return { discount: 0, code: '', error: 'Invalid or expired coupon' };
  }
  let discount = (fareAmount * coupon.discountPercentage) / 100;
  if (discount > coupon.maxDiscount) discount = coupon.maxDiscount;
  return { discount: Math.round(discount), code: coupon.code };
};

const formatRideResponse = (ride) => {
  if (!ride) return null;
  const r = ride.toObject ? ride.toObject() : ride;
  const driver = r.driverId;
  const driverUser = driver?.userId;

  return {
    ...r,
    pickup: r.pickup ? { ...r.pickup, latitude: r.pickup.lat, longitude: r.pickup.lng } : r.pickup,
    destination: r.destination ? { ...r.destination, latitude: r.destination.lat, longitude: r.destination.lng } : r.destination,
    fare: r.fareDetails ? { ...r.fareDetails, total: r.fareDetails.finalFare } : null,
    driver: driver ? {
      _id: driver._id,
      rating: driver.rating,
      ratingCount: driver.ratingCount,
      totalRides: driver.ratingCount,
      isOnline: driver.status === 'online',
      user: driverUser,
      userId: driverUser,
      vehicle: r.vehicleId || driver.vehicleId,
    } : null,
    driverLocation: r.driverLocation?.lat ? {
      latitude: r.driverLocation.lat,
      longitude: r.driverLocation.lng,
      updatedAt: r.driverLocation.updatedAt,
    } : (driver?.currentLocation?.lat ? {
      latitude: driver.currentLocation.lat,
      longitude: driver.currentLocation.lng,
    } : null),
  };
};

const notifyRide = (userId, title, message, metadata = {}) =>
  notifyRideUpdate(userId, title, message, metadata);

exports.getEstimate = async (req, res, next) => {
  try {
    const { distance, duration, vehicleType, couponCode } = req.query;
    if (!distance || !duration) {
      return res.status(400).json({ success: false, message: 'Please provide distance and duration' });
    }
    const dist = Number(distance);
    const dur = Number(duration);
    const { discount } = await applyCoupon(couponCode, calculateFare(dist, dur, vehicleType || 'sedan').finalFare);
    const estimate = calculateFare(dist, dur, vehicleType || 'sedan', { couponDiscount: discount });
    res.json({ success: true, estimate, data: estimate });
  } catch (error) {
    next(error);
  }
};

exports.estimateFromRoute = async (req, res, next) => {
  try {
    const pickup = normalizeLocation(req.body.pickup);
    const destination = normalizeLocation(req.body.destination);
    const { couponCode } = req.body;

    if (!pickup || !destination) {
      return res.status(400).json({ success: false, message: 'Pickup and destination required' });
    }

    const distance = getDistanceBetweenPoints(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const duration = estimateDurationMinutes(distance);
    const baseFare = calculateFare(distance, duration, req.body.vehicleType || 'sedan');
    const { discount, error } = await applyCoupon(couponCode, baseFare.finalFare);

    const allVehicles = calculateAllVehicleFares(distance, duration, discount);
    const nearbyDrivers = await findNearbyDrivers(pickup.lat, pickup.lng, req.body.vehicleType);

    res.json({
      success: true,
      route: { distanceKm: Math.round(distance * 100) / 100, durationMinutes: duration, etaMinutes: duration },
      estimate: calculateFare(distance, duration, req.body.vehicleType || 'sedan', { couponDiscount: discount }),
      allVehicles,
      nearbyDrivers: nearbyDrivers.length,
      couponError: error || null,
    });
  } catch (error) {
    next(error);
  }
};

exports.bookRide = async (req, res, next) => {
  try {
    const {
      pickup: rawPickup, destination: rawDestination, stops,
      distance, duration, vehicleType, paymentMethod, couponCode,
      notes, pickupNotes, dropNotes, landmark, gateNumber,
      isScheduled, scheduledAt,
    } = req.body;

    const pickup = normalizeLocation(rawPickup);
    const destination = normalizeLocation(rawDestination);

    if (!pickup?.address || !destination?.address || !vehicleType) {
      return res.status(400).json({ success: false, message: 'Please provide pickup, destination and vehicle type' });
    }

    const computedDistance = getDistanceBetweenPoints(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const rideDistance = Number(distance) || computedDistance;
    const rideDuration = Number(duration) || estimateDurationMinutes(rideDistance);

    const activeRide = await Ride.findOne({
      passengerId: req.user.id,
      status: { $in: ['pending', 'searching', 'assigned', 'arrived', 'started', 'scheduled'] },
    });
    if (activeRide) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active ride. Complete or cancel it first.',
        rideId: activeRide._id,
      });
    }

    let fare = calculateFare(rideDistance, rideDuration, vehicleType);
    const { discount } = await applyCoupon(couponCode, fare.finalFare);
    if (discount > 0) {
      fare.couponDiscount = discount;
      fare.finalFare = Math.max(fare.baseFare, fare.finalFare - discount);
      fare.total = fare.finalFare;
    }

    if (paymentMethod === 'wallet' && req.user.walletBalance < fare.finalFare) {
      return res.status(400).json({
        success: false,
        message: `Insufficient wallet balance. Need ₹${fare.finalFare}, have ₹${req.user.walletBalance}.`,
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const scheduled = isScheduled && scheduledAt;
    const initialStatus = scheduled ? 'scheduled' : 'searching';

    const ride = await Ride.create({
      passengerId: req.user.id,
      pickup,
      destination,
      stops: (stops || []).map(normalizeLocation).filter(Boolean),
      distance: rideDistance,
      duration: rideDuration,
      etaMinutes: rideDuration,
      vehicleType,
      status: initialStatus,
      isScheduled: !!scheduled,
      scheduledAt: scheduled ? new Date(scheduledAt) : undefined,
      fareDetails: fare,
      couponCode: couponCode?.toUpperCase() || '',
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'pending',
      notes: notes || '',
      pickupNotes: pickupNotes || '',
      dropNotes: dropNotes || '',
      landmark: landmark || '',
      gateNumber: gateNumber || '',
      otp,
    });

    await logActivity(req.user._id, 'ride_booked', { rideId: ride._id, vehicleType }, req);
    await notifyRide(req.user._id, scheduled ? 'Ride Scheduled' : 'Ride Booked', scheduled
      ? `Your ride is scheduled for ${new Date(scheduledAt).toLocaleString()}`
      : 'Searching for nearby drivers...');

    if (!scheduled) {
      await initiateAutoAssignment(ride._id);
    }

    const populated = await Ride.findById(ride._id)
      .populate([{ path: 'driverId', populate: { path: 'userId', select: 'name phone profilePhoto' } }, { path: 'vehicleId' }]);

    res.status(201).json({
      success: true,
      message: scheduled ? 'Ride scheduled successfully' : 'Ride booked successfully',
      ride: formatRideResponse(populated),
      data: formatRideResponse(populated),
    });
  } catch (error) {
    next(error);
  }
};

exports.getRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('passengerId', 'name phone profilePhoto')
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone profilePhoto' } })
      .populate('vehicleId');
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    res.json({ success: true, ride: formatRideResponse(ride), data: formatRideResponse(ride) });
  } catch (error) {
    next(error);
  }
};

exports.trackRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('passengerId', 'name phone profilePhoto')
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone profilePhoto' } })
      .populate('vehicleId');

    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    if (ride.driverId) {
      const driver = await Driver.findById(ride.driverId._id || ride.driverId);
      if (driver?.currentLocation?.lat) {
        ride.driverLocation = { lat: driver.currentLocation.lat, lng: driver.currentLocation.lng, updatedAt: new Date() };
        await ride.save();
      }
    }

    res.json({ success: true, ride: formatRideResponse(ride), data: formatRideResponse(ride) });
  } catch (error) {
    next(error);
  }
};

exports.acceptRide = async (req, res, next) => {
  try {
    const result = await acceptAssignment(req.params.rideId, req.user._id);
    if (!result.success) return res.status(400).json(result);
    const ride = await Ride.findById(req.params.rideId)
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone profilePhoto' } })
      .populate('vehicleId');
    res.json({ success: true, message: result.message, ride: formatRideResponse(ride) });
  } catch (error) {
    next(error);
  }
};

exports.rejectRide = async (req, res, next) => {
  try {
    const result = await rejectAssignment(req.params.rideId, req.user._id, req.body.reason);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.updateRideStatus = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { status, otp, cancellationReason } = req.body;

    const ride = await Ride.findById(rideId).populate('passengerId', 'name phone walletBalance');
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const driver = await Driver.findOne({ userId: req.user.id });
    let io;
    try { io = require('../socket').getIO(); } catch { io = null; }

    if (status === 'arrived') {
      if (ride.status !== 'assigned') return res.status(400).json({ success: false, message: 'Ride must be assigned first' });
      ride.status = 'arrived';
      await ride.save();
      await notifyRide(ride.passengerId, 'Driver Arrived', 'Your driver has arrived at pickup.');
    } else if (status === 'started') {
      if (ride.status !== 'arrived') return res.status(400).json({ success: false, message: 'Driver must arrive first' });
      if (!otp || ride.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP' });
      ride.status = 'started';
      await ride.save();
      await notifyRide(ride.passengerId, 'Trip Started', 'Your ride has started. Have a safe trip!');
    } else if (status === 'completed') {
      if (ride.status !== 'started') return res.status(400).json({ success: false, message: 'Ride must be started first' });

      if (ride.paymentMethod === 'wallet') {
        const passenger = await User.findById(ride.passengerId._id || ride.passengerId);
        if (passenger.walletBalance < ride.fareDetails.finalFare) {
          ride.paymentMethod = 'cash';
          ride.paymentStatus = 'pending';
        } else {
          passenger.walletBalance -= ride.fareDetails.finalFare;
          await passenger.save();
          ride.paymentStatus = 'paid';
          await Transaction.create({
            userId: passenger._id, amount: ride.fareDetails.finalFare,
            type: 'debit', description: `Ride ${ride.rideId}`, status: 'success',
          });
        }
      } else {
        ride.paymentStatus = 'paid';
      }

      ride.status = 'completed';
      ride.invoiceNumber = `INV${Date.now()}`;
      await ride.save();

      await createPaymentFromRide(ride, ride.paymentStatus === 'paid' ? 'paid' : 'pending');
      await notifyPaymentUpdate(
        ride.passengerId._id || ride.passengerId,
        ride.paymentStatus === 'paid' ? 'Payment Successful' : 'Payment Pending',
        ride.paymentStatus === 'paid'
          ? `₹${ride.fareDetails.finalFare} paid via ${ride.paymentMethod}`
          : `Please complete payment of ₹${ride.fareDetails.finalFare}`,
        { rideId: ride._id, amount: ride.fareDetails.finalFare }
      );

      if (driver) {
        const driverUser = await User.findById(driver.userId);
        const payout = Math.round(ride.fareDetails.finalFare * 0.85);
        driverUser.walletBalance += payout;
        await driverUser.save();
        await Transaction.create({
          userId: driverUser._id, amount: payout,
          type: 'credit', description: `Payout ${ride.rideId}`, status: 'success',
        });
        driver.status = 'online';
        await driver.save();
      }

      await notifyRide(ride.passengerId, 'Ride Completed', `Payment of ₹${ride.fareDetails.finalFare} received. Rate your ride!`);
      await logActivity(ride.passengerId, 'ride_completed', { rideId: ride._id }, req);
    } else if (status === 'cancelled') {
      if (['completed', 'cancelled'].includes(ride.status)) {
        return res.status(400).json({ success: false, message: 'Ride already finished' });
      }
      const cancelledBy = req.user.role === 'driver' ? 'driver' : 'user';
      const charge = ['assigned', 'arrived'].includes(ride.status) ? 50 : 0;

      ride.status = 'cancelled';
      ride.cancelledBy = cancelledBy;
      ride.cancellationReason = cancellationReason || 'No reason specified';
      ride.cancellationCharge = charge;
      await ride.save();

      if (charge > 0 && cancelledBy === 'user') {
        const passenger = await User.findById(ride.passengerId);
        if (passenger) {
          passenger.walletBalance = Math.max(0, passenger.walletBalance - charge);
          await passenger.save();
        }
      }

      if (ride.driverId) {
        const rideDriver = await Driver.findById(ride.driverId);
        if (rideDriver) { rideDriver.status = 'online'; await rideDriver.save(); }
      }

      await notifyRide(ride.passengerId, 'Ride Cancelled', `Ride cancelled. ${charge ? `Cancellation fee: ₹${charge}` : ''}`);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    if (io) io.to(`ride:${rideId}`).emit('ride:status', { rideId, status: ride.status, ride: formatRideResponse(ride) });

    res.json({ success: true, message: `Ride status updated to ${status}`, ride: formatRideResponse(ride) });
  } catch (error) {
    next(error);
  }
};

exports.cancelRide = async (req, res, next) => {
  req.body.status = 'cancelled';
  req.body.cancellationReason = req.body.reason || req.body.cancellationReason;
  return exports.updateRideStatus(req, res, next);
};

exports.updateScheduledRide = async (req, res, next) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.rideId, passengerId: req.user.id, status: 'scheduled' });
    if (!ride) return res.status(404).json({ success: false, message: 'Scheduled ride not found' });

    if (req.body.scheduledAt) ride.scheduledAt = new Date(req.body.scheduledAt);
    if (req.body.pickup) ride.pickup = normalizeLocation(req.body.pickup);
    if (req.body.destination) ride.destination = normalizeLocation(req.body.destination);
    if (req.body.notes !== undefined) ride.notes = req.body.notes;
    await ride.save();

    res.json({ success: true, message: 'Scheduled ride updated', ride: formatRideResponse(ride) });
  } catch (error) {
    next(error);
  }
};

exports.getActiveRide = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'passenger') {
      query = { passengerId: req.user.id, status: { $in: ['pending', 'searching', 'assigned', 'arrived', 'started', 'scheduled'] } };
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver) return res.json({ success: true, ride: null });
      query = { driverId: driver._id, status: { $in: ['assigned', 'arrived', 'started'] } };
    } else {
      return res.json({ success: true, ride: null });
    }

    const ride = await Ride.findOne(query)
      .populate('passengerId', 'name phone profilePhoto')
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone profilePhoto' } })
      .populate('vehicleId');

    res.json({ success: true, ride: ride ? formatRideResponse(ride) : null });
  } catch (error) {
    next(error);
  }
};

exports.getRideHistory = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};

    if (req.user.role === 'passenger') {
      query.passengerId = req.user.id;
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver) return res.json({ success: true, rides: [], data: [] });
      query.driverId = driver._id;
    }

    if (status === 'completed') query.status = 'completed';
    else if (status === 'cancelled') query.status = 'cancelled';
    else if (status === 'upcoming') query.status = { $in: ['scheduled', 'searching', 'assigned'] };

    const rides = await Ride.find(query)
      .populate('passengerId', 'name phone email')
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone profilePhoto' } })
      .populate('vehicleId')
      .sort({ createdAt: -1 });

    const formatted = rides.map(formatRideResponse);
    res.json({ success: true, rides: formatted, data: formatted });
  } catch (error) {
    next(error);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('passengerId', 'name email phone')
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone' } })
      .populate('vehicleId');

    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.status !== 'completed') return res.status(400).json({ success: false, message: 'Invoice available for completed rides only' });

    const invoice = {
      invoiceNumber: ride.invoiceNumber || `INV${ride._id}`,
      rideId: ride.rideId,
      date: ride.updatedAt,
      passenger: ride.passengerId,
      driver: ride.driverId?.userId,
      vehicle: ride.vehicleId,
      pickup: ride.pickup,
      destination: ride.destination,
      distance: ride.distance,
      duration: ride.duration,
      fareBreakdown: ride.fareDetails,
      paymentMethod: ride.paymentMethod,
      paymentStatus: ride.paymentStatus,
      gst: ride.fareDetails.gst,
      total: ride.fareDetails.finalFare,
    };

    if (req.query.format === 'html') {
      const html = `<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title></head><body style="font-family:sans-serif;padding:40px">
        <h1>CabBook Invoice</h1><p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Ride:</strong> ${invoice.rideId}</p><p><strong>Date:</strong> ${new Date(invoice.date).toLocaleString()}</p>
        <hr/><p><strong>From:</strong> ${ride.pickup.address}</p><p><strong>To:</strong> ${ride.destination.address}</p>
        <p>Distance: ${ride.distance} km · Duration: ${ride.duration} min</p>
        <hr/><table style="width:100%"><tr><td>Base Fare</td><td>₹${ride.fareDetails.baseFare}</td></tr>
        <tr><td>Distance</td><td>₹${ride.fareDetails.distanceCharge}</td></tr>
        <tr><td>Time</td><td>₹${ride.fareDetails.timeCharge}</td></tr>
        <tr><td>GST (5%)</td><td>₹${ride.fareDetails.gst}</td></tr>
        <tr><td>Discount</td><td>-₹${ride.fareDetails.couponDiscount || 0}</td></tr>
        <tr style="font-weight:bold"><td>Total</td><td>₹${ride.fareDetails.finalFare}</td></tr></table>
        <p>Payment: ${ride.paymentMethod} · ${ride.paymentStatus}</p>
        </body></html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

exports.shareRide = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ride-tracking/${ride._id}`;
    res.json({
      success: true,
      share: { url, text: `Track my CabBook ride: ${url}`, rideId: ride.rideId, status: ride.status },
    });
  } catch (error) {
    next(error);
  }
};

exports.submitRating = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { rating, comment, issueReported } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1-5' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.status !== 'completed') return res.status(400).json({ success: false, message: 'Can only rate completed rides' });

    if (req.user.role === 'passenger') {
      if (ride.passengerId.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not your ride' });
      ride.driverRating = { rating, comment, issueReported: !!issueReported };
      await ride.save();

      const driver = await Driver.findById(ride.driverId);
      if (driver) {
        driver.ratingCount += 1;
        driver.rating = ((driver.rating * (driver.ratingCount - 1)) + Number(rating)) / driver.ratingCount;
        await driver.save();
      }
    } else if (req.user.role === 'driver') {
      const driver = await Driver.findOne({ userId: req.user.id });
      if (!driver || ride.driverId?.toString() !== driver._id.toString()) {
        return res.status(403).json({ success: false, message: 'Not your ride' });
      }
      ride.passengerRating = { rating, comment };
      await ride.save();
    }

    res.json({ success: true, message: 'Rating submitted', ride: formatRideResponse(ride) });
  } catch (error) {
    next(error);
  }
};

exports.getNearbyDrivers = async (req, res, next) => {
  try {
    const { lat, lng, vehicleType } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'Coordinates required' });
    const nearby = await findNearbyDrivers(Number(lat), Number(lng), vehicleType);
    res.json({
      success: true,
      count: nearby.length,
      drivers: nearby.map((n) => ({
        distance: Math.round(n.distance * 100) / 100,
        driver: { id: n.driver._id, rating: n.driver.rating, name: n.driver.userId?.name },
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDriverLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.currentLocation = { lat: Number(lat), lng: Number(lng) };
    await driver.save();

    const activeRide = await Ride.findOne({ driverId: driver._id, status: { $in: ['assigned', 'arrived', 'started'] } });
    if (activeRide) {
      activeRide.driverLocation = { lat: Number(lat), lng: Number(lng), updatedAt: new Date() };
      await activeRide.save();

      try {
        const io = require('../socket').getIO();
        io.to(`ride:${activeRide._id}`).emit('ride:location', {
          rideId: activeRide._id,
          lat: Number(lat),
          lng: Number(lng),
          updatedAt: new Date(),
        });
      } catch { /* socket optional */ }
    }

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    next(error);
  }
};
