const AssignmentHistory = require('../models/AssignmentHistory');
const Ride = require('../models/Ride');
const {
  findEligibleDrivers,
  initiateAutoAssignment,
  manualAssign,
  acceptAssignment,
  rejectAssignment,
  reassignRide,
  isDriverEligible,
  isVehicleAvailable,
  ASSIGNMENT_TIMEOUT_MS,
} = require('../services/driverAssignmentService');

exports.searchAvailableDrivers = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });

    const { vehicleType, lat, lng, radius } = req.query;
    if (vehicleType) ride.vehicleType = vehicleType;
    if (lat && lng) ride.pickup = { ...ride.pickup, lat: Number(lat), lng: Number(lng) };

    const drivers = await findEligibleDrivers(ride, {
      limit: Number(req.query.limit) || 20,
      maxRadius: Number(radius) || 15,
    });

    res.json({
      success: true,
      count: drivers.length,
      timeoutMs: ASSIGNMENT_TIMEOUT_MS,
      drivers: drivers.map((d) => ({
        driverId: d.driver._id,
        name: d.driverName,
        phone: d.driverPhone,
        rating: d.driverRating,
        distanceKm: d.distanceKm,
        etaMinutes: d.etaMinutes,
        score: Math.round(d.score),
        vehicleType: d.vehicleType,
        vehicleNumber: d.vehicleNumber,
        status: d.driver.status,
        verificationStatus: d.driver.verificationStatus,
        vehicleAvailable: isVehicleAvailable(d.vehicle),
      })),
    });
  } catch (error) {
    next(error);
  }
};

exports.autoAssign = async (req, res, next) => {
  try {
    const result = await initiateAutoAssignment(req.params.rideId);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.manualAssign = async (req, res, next) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ success: false, message: 'driverId required' });
    const result = await manualAssign(req.params.rideId, driverId, req.user._id);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.reassign = async (req, res, next) => {
  try {
    const { driverId } = req.body;
    const result = await reassignRide(req.params.rideId, req.user._id, driverId);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.driverAccept = async (req, res, next) => {
  try {
    const result = await acceptAssignment(req.params.rideId, req.user._id);
    if (!result.success) return res.status(400).json(result);
    const ride = await Ride.findById(req.params.rideId)
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone profilePhoto' } })
      .populate('vehicleId')
      .populate('passengerId', 'name phone');
    res.json({ success: true, message: result.message, ride });
  } catch (error) {
    next(error);
  }
};

exports.driverReject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await rejectAssignment(req.params.rideId, req.user._id, reason);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.checkDriverAvailability = async (req, res, next) => {
  try {
    const Driver = require('../models/Driver');
    const driver = await Driver.findById(req.params.driverId).populate('vehicleId');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const ride = req.query.rideId
      ? await Ride.findById(req.query.rideId)
      : { vehicleType: req.query.vehicleType || 'sedan', _id: null };

    const check = await isDriverEligible(driver, ride, driver.vehicleId);

    res.json({
      success: true,
      driverId: driver._id,
      available: check.eligible,
      reason: check.reason || null,
      status: driver.status,
      verificationStatus: driver.verificationStatus,
      lastLocation: driver.currentLocation,
      vehicle: driver.vehicleId ? {
        type: driver.vehicleId.type,
        number: driver.vehicleId.vehicleNumber,
        status: driver.vehicleId.status,
        verificationStatus: driver.vehicleId.verificationStatus,
        available: isVehicleAvailable(driver.vehicleId),
      } : null,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAssignmentHistory = async (req, res, next) => {
  try {
    const query = {};
    if (req.params.rideId) query.rideId = req.params.rideId;
    if (req.query.driverId) query.driverId = req.query.driverId;

    const history = await AssignmentHistory.find(query)
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone' } })
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 50);

    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

exports.getPendingForDriver = async (req, res, next) => {
  try {
    const Driver = require('../models/Driver');
    const driver = await Driver.findOne({ userId: req.user._id });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const pending = await Ride.find({
      $or: [
        { pendingDriverId: driver._id, status: 'searching' },
        { status: 'searching', driverId: null, pendingDriverId: null },
      ],
    })
      .populate('passengerId', 'name phone profilePhoto')
      .sort({ createdAt: -1 })
      .limit(10);

    const assigned = await Ride.find({
      driverId: driver._id,
      status: { $in: ['assigned', 'arrived', 'started'] },
    }).populate('passengerId', 'name phone profilePhoto');

    res.json({
      success: true,
      pendingOffers: pending.map((r) => ({
        ...r.toObject(),
        expiresAt: r.assignmentExpiresAt,
        isDirectOffer: r.pendingDriverId?.toString() === driver._id.toString(),
      })),
      activeRides: assigned,
    });
  } catch (error) {
    next(error);
  }
};
