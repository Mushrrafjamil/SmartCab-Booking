const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Ride = require('../models/Ride');
const Transaction = require('../models/Transaction');
const { createDefaultResources, validatePassword, AADHAAR_REGEX, PAN_REGEX, logActivity } = require('../services/authService');

exports.getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'passenger' });
    const totalDrivers = await Driver.countDocuments();
    const activeDrivers = await Driver.countDocuments({ status: 'online' });
    const busyDrivers = await Driver.countDocuments({ status: 'busy' });
    const pendingDriverApprovals = await Driver.countDocuments({ verificationStatus: 'pending' });

    const totalVehicles = await Vehicle.countDocuments();
    const pendingVehicleApprovals = await Vehicle.countDocuments({ verificationStatus: 'pending' });

    const totalRides = await Ride.countDocuments();
    const completedRides = await Ride.countDocuments({ status: 'completed' });
    const activeRides = await Ride.countDocuments({ status: { $in: ['assigned', 'arrived', 'started'] } });

    // Calculate revenue (sum of all completed ride fares)
    const rides = await Ride.find({ status: 'completed' });
    const totalRevenue = rides.reduce((sum, ride) => sum + (ride.fareDetails.finalFare || 0), 0);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalDrivers,
        activeDrivers,
        busyDrivers,
        pendingDriverApprovals,
        totalVehicles,
        pendingVehicleApprovals,
        totalRides,
        completedRides,
        activeRides,
        totalRevenue: Math.round(totalRevenue)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Users management
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } }).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
};

exports.toggleUserSuspend = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'driver') {
      const driver = await Driver.findOne({ userId: user._id });
      if (driver) {
        driver.verificationStatus = driver.verificationStatus === 'suspended' ? 'approved' : 'suspended';
        driver.status = 'offline';
        await driver.save();
      }
    }

    res.status(200).json({ success: true, message: `User status toggled successfully` });
  } catch (error) {
    next(error);
  }
};

// Driver management
exports.getPendingDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find({ verificationStatus: { $in: ['pending', 'under_review'] } })
      .populate('userId', 'name email phone profilePhoto')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, drivers });
  } catch (error) {
    next(error);
  }
};

exports.getDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find().populate('userId', 'name email phone profilePhoto').populate('vehicleId').sort({ createdAt: -1 });
    res.status(200).json({ success: true, drivers });
  } catch (error) {
    next(error);
  }
};

exports.createDriver = async (req, res, next) => {
  try {
    const {
      name, email, phone, password,
      licenseNumber, aadhaarNumber, panNumber,
      address, city, state, pincode,
      vehicleNumber, vehicleType, vehicleBrand, vehicleModel, vehicleColor,
      autoApprove = true,
    } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, phone, and password are required' });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must have uppercase, lowercase, number and special character' });
    }
    if (aadhaarNumber && !AADHAAR_REGEX.test(aadhaarNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid Aadhaar format (12 digits)' });
    }
    if (panNumber && !PAN_REGEX.test(panNumber)) {
      return res.status(400).json({ success: false, message: 'Invalid PAN format' });
    }

    const exists = await User.findOne({ $or: [{ email: email.trim().toLowerCase() }, { phone: phone.trim() }], isDeleted: false });
    if (exists) return res.status(409).json({ success: false, message: 'Email or phone already registered' });

    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      role: 'driver',
      acceptTerms: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    const driver = await Driver.create({
      userId: user._id,
      licenseNumber: licenseNumber?.trim() || undefined,
      aadhaarNumber: aadhaarNumber?.trim() || undefined,
      panNumber: panNumber?.trim()?.toUpperCase() || undefined,
      address: address?.trim(),
      city: city?.trim(),
      state: state?.trim(),
      pincode: pincode?.trim(),
      verificationStatus: autoApprove ? 'approved' : 'pending',
      registrationStep: 7,
      status: 'offline',
    });

    if (vehicleNumber?.trim() && vehicleType) {
      const plate = vehicleNumber.trim().toUpperCase();
      const plateTaken = await Vehicle.findOne({ vehicleNumber: plate });
      if (plateTaken) {
        await User.findByIdAndDelete(user._id);
        await Driver.findByIdAndDelete(driver._id);
        return res.status(409).json({ success: false, message: 'Vehicle plate number already registered' });
      }

      const vehicle = await Vehicle.create({
        driverId: driver._id,
        vehicleNumber: plate,
        type: vehicleType.toLowerCase(),
        brand: vehicleBrand?.trim() || 'N/A',
        model: vehicleModel?.trim() || 'N/A',
        color: vehicleColor?.trim() || 'N/A',
        seatingCapacity: 4,
        fuelType: 'petrol',
        insuranceNumber: 'ADMIN-PENDING',
        rcBookNumber: 'ADMIN-PENDING',
        verificationStatus: autoApprove ? 'approved' : 'pending',
        status: autoApprove ? 'available' : 'offline',
      });

      driver.vehicleId = vehicle._id;
      driver.vehicleNumber = plate;
      driver.vehicleType = vehicle.type;
      driver.vehicleBrand = vehicle.brand;
      driver.vehicleModel = vehicle.model;
      driver.vehicleColor = vehicle.color;
      await driver.save();
    }

    await createDefaultResources(user);
    await logActivity(req.user._id, 'admin_created_driver', { driverId: driver._id, userId: user._id });

    const populated = await Driver.findById(driver._id)
      .populate('userId', 'name email phone profilePhoto')
      .populate('vehicleId');

    res.status(201).json({ success: true, message: 'Driver created successfully', driver: populated });
  } catch (error) {
    next(error);
  }
};

exports.approveDriverStatus = async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'suspended'

    if (!['approved', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    driver.verificationStatus = status;
    if (status !== 'approved') {
      driver.status = 'offline';
    }
    await driver.save();

    res.status(200).json({ success: true, message: `Driver verification status updated to ${status}`, driver });
  } catch (error) {
    next(error);
  }
};

// Vehicle management
exports.getPendingVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ verificationStatus: 'pending' }).populate({
      path: 'driverId',
      populate: { path: 'userId', select: 'name phone' }
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, vehicles });
  } catch (error) {
    next(error);
  }
};

exports.approveVehicleStatus = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    vehicle.verificationStatus = status;
    if (status === 'approved') {
      vehicle.status = 'available';
    } else {
      vehicle.status = 'offline';
    }
    await vehicle.save();

    res.status(200).json({ success: true, message: `Vehicle verification status updated to ${status}`, vehicle });
  } catch (error) {
    next(error);
  }
};

// Live monitor rides
exports.getLiveRides = async (req, res, next) => {
  try {
    const rides = await Ride.find({ status: { $in: ['searching', 'assigned', 'arrived', 'started'] } })
      .populate('passengerId', 'name phone')
      .populate({
        path: 'driverId',
        populate: { path: 'userId', select: 'name phone' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, rides });
  } catch (error) {
    next(error);
  }
};
