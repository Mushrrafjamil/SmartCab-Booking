const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const User = require('../models/User');
const AssignmentHistory = require('../models/AssignmentHistory');
const Notification = require('../models/Notification');
const { logActivity } = require('./authService');
const { getDistanceKm, estimateDurationMinutes } = require('./geocodingService');

const ASSIGNMENT_TIMEOUT_MS = parseInt(process.env.ASSIGNMENT_TIMEOUT_MS || '30000', 10);
const MAX_ASSIGNMENT_ATTEMPTS = parseInt(process.env.MAX_ASSIGNMENT_ATTEMPTS || '5', 10);
const MAX_SEARCH_RADIUS_KM = parseFloat(process.env.MAX_SEARCH_RADIUS_KM || '15');

const pendingTimeouts = new Map();

const VEHICLE_TYPE_COMPAT = {
  bike: ['bike'],
  auto: ['auto'],
  mini: ['mini', 'sedan'],
  sedan: ['sedan', 'mini'],
  suv: ['suv', 'xl'],
  xl: ['suv', 'xl'],
  premium: ['luxury', 'premium', 'sedan'],
  luxury: ['luxury', 'premium'],
  electric: ['electric', 'sedan', 'mini'],
};

const emitSocket = (event, room, data) => {
  try {
    const io = require('../socket').getIO();
    if (room) io.to(room).emit(event, data);
    else io.emit(event, data);
  } catch { /* socket optional */ }
};

const notifyUser = async (userId, title, message) => {
  await Notification.create({ userId, title, message, type: 'ride', read: false });
};

const isVehicleTypeMatch = (rideType, driver, vehicle) => {
  const compat = VEHICLE_TYPE_COMPAT[rideType] || [rideType];
  const types = [driver?.vehicleType, vehicle?.type].filter(Boolean).map((t) => t.toLowerCase());
  return types.some((t) => compat.includes(t));
};

const isVehicleAvailable = (vehicle) => {
  if (!vehicle) return false;
  if (vehicle.verificationStatus !== 'approved') return false;
  if (vehicle.status === 'maintenance' || vehicle.status === 'offline') return false;
  if (vehicle.isActive === false) return false;
  const now = new Date();
  if (vehicle.insuranceExpiry && vehicle.insuranceExpiry < now) return false;
  if (vehicle.fitnessExpiry && vehicle.fitnessExpiry < now) return false;
  return true;
};

const isDriverEligible = async (driver, ride, vehicle) => {
  if (!driver) return { eligible: false, reason: 'Driver not found' };
  if (driver.verificationStatus !== 'approved') return { eligible: false, reason: 'Driver not verified' };
  if (driver.verificationStatus === 'suspended') return { eligible: false, reason: 'Driver suspended' };
  if (driver.status !== 'online') return { eligible: false, reason: `Driver is ${driver.status}` };

  const user = await User.findById(driver.userId);
  if (!user || user.isSuspended || !user.isActive || user.isDeleted) {
    return { eligible: false, reason: 'Driver account inactive' };
  }

  const activeRide = await Ride.findOne({
    driverId: driver._id,
    status: { $in: ['assigned', 'arrived', 'started'] },
    _id: { $ne: ride._id },
  });
  if (activeRide) return { eligible: false, reason: 'Driver on another ride' };

  if (!isVehicleTypeMatch(ride.vehicleType, driver, vehicle)) {
    return { eligible: false, reason: 'Vehicle type mismatch' };
  }

  if (!isVehicleAvailable(vehicle)) {
    return { eligible: false, reason: 'Vehicle unavailable' };
  }

  return { eligible: true };
};

const scoreDriver = (distanceKm, rating, etaMinutes) => {
  const distanceScore = Math.max(0, 100 - distanceKm * 8);
  const ratingScore = (rating || 5) * 15;
  const etaScore = Math.max(0, 60 - etaMinutes * 3);
  return distanceScore * 0.5 + ratingScore * 0.3 + etaScore * 0.2;
};

const findEligibleDrivers = async (ride, options = {}) => {
  const { excludeDriverIds = [], limit = 10, maxRadius = MAX_SEARCH_RADIUS_KM } = options;
  const pickup = ride.pickup;
  if (!pickup?.lat) return [];

  const drivers = await Driver.find({
    status: 'online',
    verificationStatus: 'approved',
    _id: { $nin: excludeDriverIds },
    'currentLocation.lat': { $exists: true },
  })
    .populate({ path: 'userId', select: 'name phone profilePhoto isSuspended isActive' })
    .populate('vehicleId');

  const results = [];

  for (const driver of drivers) {
    const vehicle = driver.vehicleId;
    const check = await isDriverEligible(driver, ride, vehicle);
    if (!check.eligible) continue;

    const distanceKm = getDistanceKm(
      pickup.lat, pickup.lng,
      driver.currentLocation.lat, driver.currentLocation.lng
    );
    if (distanceKm > maxRadius) continue;

    const etaMinutes = Math.max(2, Math.round(distanceKm * 2.5));
    results.push({
      driver,
      vehicle,
      distanceKm: Math.round(distanceKm * 100) / 100,
      etaMinutes,
      score: scoreDriver(distanceKm, driver.rating, etaMinutes),
      driverName: driver.userId?.name,
      driverPhone: driver.userId?.phone,
      driverRating: driver.rating,
      vehicleNumber: vehicle?.vehicleNumber || driver.vehicleNumber,
      vehicleType: vehicle?.type || driver.vehicleType,
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
};

const clearAssignmentTimeout = (rideId) => {
  const key = rideId.toString();
  if (pendingTimeouts.has(key)) {
    clearTimeout(pendingTimeouts.get(key));
    pendingTimeouts.delete(key);
  }
};

const recordAssignment = async (data) => AssignmentHistory.create(data);

const offerRideToDriver = async (ride, driver, vehicle, meta = {}) => {
  const distanceKm = getDistanceKm(
    ride.pickup.lat, ride.pickup.lng,
    driver.currentLocation.lat, driver.currentLocation.lng
  );
  const etaMinutes = Math.max(2, Math.round(distanceKm * 2.5));

  ride.pendingDriverId = driver._id;
  ride.assignmentExpiresAt = new Date(Date.now() + ASSIGNMENT_TIMEOUT_MS);
  ride.assignmentAttempts += 1;
  await ride.save();

  const history = await recordAssignment({
    rideId: ride._id,
    driverId: driver._id,
    vehicleId: vehicle?._id || driver.vehicleId,
    assignedBy: meta.assignedBy || 'system',
    adminId: meta.adminId,
    type: meta.type || 'auto',
    status: 'offered',
    distanceKm,
    etaMinutes,
    driverRating: driver.rating,
  });

  emitSocket('ride:request', `driver:${driver.userId}`, {
    rideId: ride._id,
    ride: { id: ride._id, pickup: ride.pickup, destination: ride.destination, fare: ride.fareDetails, vehicleType: ride.vehicleType },
    expiresAt: ride.assignmentExpiresAt,
    etaMinutes,
    assignmentId: history._id,
  });

  await notifyUser(driver.userId, 'New Ride Request', `Pickup: ${ride.pickup.address} · ₹${ride.fareDetails?.finalFare} · ${etaMinutes} min away`);

  clearAssignmentTimeout(ride._id);
  const timeout = setTimeout(() => handleAssignmentTimeout(ride._id.toString()), ASSIGNMENT_TIMEOUT_MS);
  pendingTimeouts.set(ride._id.toString(), timeout);

  return { driver, vehicle, distanceKm, etaMinutes, history };
};

const handleAssignmentTimeout = async (rideId) => {
  try {
    const ride = await Ride.findById(rideId);
    if (!ride || ride.status !== 'searching' || !ride.pendingDriverId) return;

    const timedOutDriverId = ride.pendingDriverId;
    await AssignmentHistory.findOneAndUpdate(
      { rideId: ride._id, driverId: timedOutDriverId, status: 'offered' },
      { status: 'timeout', respondedAt: new Date(), reason: 'No response within timeout' },
      { sort: { createdAt: -1 } }
    );

    if (!ride.rejectedDrivers.includes(timedOutDriverId)) {
      ride.rejectedDrivers.push(timedOutDriverId);
    }
    ride.pendingDriverId = null;
    ride.assignmentExpiresAt = null;
    await ride.save();

    const timedOutDriver = await Driver.findById(timedOutDriverId);
    if (timedOutDriver) await notifyUser(timedOutDriver.userId, 'Ride Request Expired', 'You did not respond in time.');

    if (ride.assignmentAttempts >= MAX_ASSIGNMENT_ATTEMPTS) {
      ride.status = 'cancelled';
      ride.cancellationReason = 'No drivers available';
      ride.cancelledBy = 'system';
      await ride.save();
      await notifyUser(ride.passengerId, 'Ride Cancelled', 'No drivers accepted your request. Please try again.');
      emitSocket('ride:status', `ride:${ride._id}`, { rideId: ride._id, status: 'cancelled' });
      return;
    }

    await initiateAutoAssignment(ride._id, { isReassign: true });
  } catch (err) {
    console.error('Assignment timeout error:', err.message);
  }
};

const confirmAssignment = async (ride, driver, vehicle, meta = {}) => {
  clearAssignmentTimeout(ride._id);

  ride.driverId = driver._id;
  ride.vehicleId = vehicle?._id || driver.vehicleId;
  ride.pendingDriverId = null;
  ride.assignmentExpiresAt = null;
  ride.status = 'assigned';
  ride.assignedBy = meta.assignedBy || 'system';
  ride.driverLocation = {
    lat: driver.currentLocation?.lat,
    lng: driver.currentLocation?.lng,
    updatedAt: new Date(),
  };
  await ride.save();

  driver.status = 'busy';
  await driver.save();
  if (vehicle) {
    vehicle.status = 'busy';
    await vehicle.save();
  }

  await AssignmentHistory.findOneAndUpdate(
    { rideId: ride._id, driverId: driver._id, status: 'offered' },
    { status: 'accepted', respondedAt: new Date() },
    { sort: { createdAt: -1 } }
  );

  await notifyUser(ride.passengerId, 'Driver Assigned', `${driver.userId?.name || 'Your driver'} is on the way!`);
  emitSocket('ride:assigned', `ride:${ride._id}`, { rideId: ride._id, status: 'assigned', driverId: driver._id });
  emitSocket('ride:status', `ride:${ride._id}`, { rideId: ride._id, status: 'assigned' });

  await logActivity(ride.passengerId, 'driver_assigned', { rideId: ride._id, driverId: driver._id, type: meta.type || 'auto' });

  return ride;
};

const initiateAutoAssignment = async (rideId, options = {}) => {
  const ride = await Ride.findById(rideId);
  if (!ride || !['searching', 'scheduled'].includes(ride.status)) {
    return { success: false, message: 'Ride not available for assignment' };
  }

  if (ride.status === 'scheduled') {
    ride.status = 'searching';
    await ride.save();
  }

  const excludeIds = [...(ride.rejectedDrivers || [])];
  if (ride.pendingDriverId) excludeIds.push(ride.pendingDriverId);

  const candidates = await findEligibleDrivers(ride, { excludeDriverIds: excludeIds, limit: 1 });

  if (candidates.length === 0) {
    if (ride.assignmentAttempts >= MAX_ASSIGNMENT_ATTEMPTS) {
      ride.status = 'cancelled';
      ride.cancellationReason = 'No eligible drivers found';
      ride.cancelledBy = 'system';
      await ride.save();
      await notifyUser(ride.passengerId, 'Ride Cancelled', 'No drivers available in your area.');
      return { success: false, message: 'No drivers available' };
    }
    ride.assignmentAttempts += 1;
    await ride.save();
    setTimeout(() => initiateAutoAssignment(rideId, options), 10000);
    return { success: true, message: 'Searching for drivers...', searching: true };
  }

  const best = candidates[0];
  await offerRideToDriver(ride, best.driver, best.vehicle, { type: options.isReassign ? 'reassign' : 'auto', assignedBy: 'system' });

  return { success: true, message: 'Ride offered to driver', driver: best.driver, etaMinutes: best.etaMinutes };
};

const manualAssign = async (rideId, driverId, adminId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) return { success: false, message: 'Ride not found' };
  if (!['searching', 'scheduled', 'pending'].includes(ride.status)) {
    return { success: false, message: 'Ride cannot be assigned in current status' };
  }

  clearAssignmentTimeout(ride._id);
  if (ride.pendingDriverId) {
    await AssignmentHistory.findOneAndUpdate(
      { rideId: ride._id, driverId: ride.pendingDriverId, status: 'offered' },
      { status: 'reassigned', reason: 'Manual assignment by admin' },
      { sort: { createdAt: -1 } }
    );
  }

  const driver = await Driver.findById(driverId).populate('userId', 'name phone').populate('vehicleId');
  if (!driver) return { success: false, message: 'Driver not found' };

  const check = await isDriverEligible(driver, ride, driver.vehicleId);
  if (!check.eligible) return { success: false, message: check.reason };

  await recordAssignment({
    rideId: ride._id,
    driverId: driver._id,
    vehicleId: driver.vehicleId?._id,
    assignedBy: 'admin',
    adminId,
    type: 'manual',
    status: 'offered',
    distanceKm: getDistanceKm(ride.pickup.lat, ride.pickup.lng, driver.currentLocation.lat, driver.currentLocation.lng),
    driverRating: driver.rating,
  });

  await confirmAssignment(ride, driver, driver.vehicleId, { assignedBy: 'admin', type: 'manual' });
  await logActivity(adminId, 'manual_driver_assignment', { rideId, driverId });

  return { success: true, message: 'Driver assigned manually', ride };
};

const acceptAssignment = async (rideId, driverUserId) => {
  const driver = await Driver.findOne({ userId: driverUserId });
  if (!driver) return { success: false, message: 'Driver not found' };

  const ride = await Ride.findById(rideId);
  if (!ride) return { success: false, message: 'Ride not found' };

  const canAccept = ride.pendingDriverId?.toString() === driver._id.toString()
    || (ride.status === 'searching' && !ride.pendingDriverId);

  if (!canAccept) return { success: false, message: 'This ride is not assigned to you' };
  if (ride.assignmentExpiresAt && ride.assignmentExpiresAt < new Date()) {
    return { success: false, message: 'Assignment expired' };
  }

  const vehicle = await Vehicle.findById(driver.vehicleId);
  const check = await isDriverEligible(driver, ride, vehicle);
  if (!check.eligible) return { success: false, message: check.reason };

  await confirmAssignment(ride, driver, vehicle, { type: 'auto' });
  return { success: true, message: 'Ride accepted', ride };
};

const rejectAssignment = async (rideId, driverUserId, reason = 'Driver rejected') => {
  const driver = await Driver.findOne({ userId: driverUserId });
  if (!driver) return { success: false, message: 'Driver not found' };

  const ride = await Ride.findById(rideId);
  if (!ride) return { success: false, message: 'Ride not found' };

  const isPending = ride.pendingDriverId?.toString() === driver._id.toString();
  const isAssigned = ride.driverId?.toString() === driver._id.toString() && ride.status === 'assigned';

  if (!isPending && !isAssigned) {
    return { success: false, message: 'Cannot reject this ride' };
  }

  clearAssignmentTimeout(ride._id);

  await AssignmentHistory.findOneAndUpdate(
    { rideId: ride._id, driverId: driver._id, status: { $in: ['offered', 'accepted'] } },
    { status: 'rejected', respondedAt: new Date(), reason },
    { sort: { createdAt: -1 } }
  );

  if (!ride.rejectedDrivers.includes(driver._id)) ride.rejectedDrivers.push(driver._id);

  if (isAssigned) {
    ride.driverId = null;
    ride.vehicleId = null;
    ride.status = 'searching';
    ride.pendingDriverId = null;
    await ride.save();
    driver.status = 'online';
    await driver.save();
    await notifyUser(ride.passengerId, 'Driver Unavailable', 'Finding another driver...');
    return initiateAutoAssignment(rideId, { isReassign: true });
  }

  ride.pendingDriverId = null;
  ride.assignmentExpiresAt = null;
  await ride.save();

  await notifyUser(ride.passengerId, 'Finding Driver', 'Previous driver declined. Searching again...');
  return initiateAutoAssignment(rideId, { isReassign: true });
};

const reassignRide = async (rideId, adminId, driverId = null) => {
  const ride = await Ride.findById(rideId);
  if (!ride) return { success: false, message: 'Ride not found' };

  if (ride.driverId) {
    const prevDriver = await Driver.findById(ride.driverId);
    if (prevDriver) {
      prevDriver.status = 'online';
      await prevDriver.save();
      if (!ride.rejectedDrivers.includes(prevDriver._id)) ride.rejectedDrivers.push(prevDriver._id);
    }
    await AssignmentHistory.create({
      rideId: ride._id, driverId: ride.driverId, type: 'reassign', status: 'reassigned',
      assignedBy: 'admin', adminId, reason: 'Admin initiated reassignment',
    });
  }

  ride.driverId = null;
  ride.vehicleId = null;
  ride.pendingDriverId = null;
  ride.status = 'searching';
  await ride.save();

  clearAssignmentTimeout(ride._id);

  if (driverId) return manualAssign(rideId, driverId, adminId);
  return initiateAutoAssignment(rideId, { isReassign: true });
};

module.exports = {
  ASSIGNMENT_TIMEOUT_MS,
  findEligibleDrivers,
  initiateAutoAssignment,
  manualAssign,
  acceptAssignment,
  rejectAssignment,
  reassignRide,
  offerRideToDriver,
  confirmAssignment,
  isDriverEligible,
  isVehicleAvailable,
  clearAssignmentTimeout,
};
