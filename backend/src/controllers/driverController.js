const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');

const getUserId = (req) => req.user._id || req.user.id;

const DOC_FIELD_MAP = {
  'license-front': 'licenseFront',
  'license-back': 'licenseBack',
  'aadhaar-front': 'aadhaarFront',
  'aadhaar-back': 'aadhaarBack',
  pan: 'panCardImage',
  'rc-book': 'rcBook',
  insurance: 'insuranceCertificate',
};

const buildDocumentsResponse = (driver) => ({
  'license-front': { label: 'Driving License (Front)', url: driver.licenseFront || null },
  'license-back': { label: 'Driving License (Back)', url: driver.licenseBack || null },
  'aadhaar-front': { label: 'Aadhaar (Front)', url: driver.aadhaarFront || null },
  'aadhaar-back': { label: 'Aadhaar (Back)', url: driver.aadhaarBack || null },
  pan: { label: 'PAN Card', url: driver.panCardImage || null },
  'rc-book': { label: 'RC Book', url: driver.rcBook || null },
  insurance: { label: 'Vehicle Insurance', url: driver.insuranceCertificate || null },
});

exports.getDriverDashboard = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id }).populate('userId', 'name email phone profilePhoto').populate('vehicleId');
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Completed rides today
    const completedRidesToday = await Ride.find({
      driverId: driver._id,
      status: 'completed',
      updatedAt: { $gte: startOfToday }
    });

    const todayEarnings = completedRidesToday.reduce((sum, ride) => {
      return sum + (ride.fareDetails.finalFare * 0.85);
    }, 0);

    // Pending rides (assigned to driver but not completed/cancelled)
    const pendingRides = await Ride.find({
      driverId: driver._id,
      status: { $in: ['assigned', 'arrived', 'started'] }
    });

    res.status(200).json({
      success: true,
      driver: {
        id: driver._id,
        isOnline: driver.status === 'online',
        status: driver.status,
        rating: driver.rating,
        verificationStatus: driver.verificationStatus
      },
      todayEarnings: Math.round(todayEarnings),
      completedToday: completedRidesToday.length,
      pendingRides
    });
  } catch (error) {
    next(error);
  }
};

exports.getDriverProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: getUserId(req) })
      .populate('userId', 'name email phone profilePhoto walletBalance isEmailVerified isPhoneVerified')
      .populate('vehicleId');

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    const totalRides = await Ride.countDocuments({ driverId: driver._id, status: 'completed' });
    const completedRides = await Ride.find({ driverId: driver._id, status: 'completed' });
    const totalEarnings = completedRides.reduce((sum, r) => sum + ((r.fareDetails?.finalFare || 0) * 0.85), 0);

    res.status(200).json({
      success: true,
      driver: {
        ...driver.toObject(),
        totalRides,
        totalEarnings: Math.round(totalEarnings),
        documents: buildDocumentsResponse(driver),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.toggleOnlineStatus = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: getUserId(req) });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    if (driver.verificationStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Your driver account has not been approved yet' });
    }

    driver.status = driver.status === 'online' ? 'offline' : 'online';
    await driver.save();
    res.json({ success: true, message: `You are now ${driver.status}`, status: driver.status });
  } catch (error) {
    next(error);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: getUserId(req) });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, documents: buildDocumentsResponse(driver) });
  } catch (error) {
    next(error);
  }
};

exports.uploadDocument = async (req, res, next) => {
  try {
    const field = DOC_FIELD_MAP[req.params.docType];
    if (!field) return res.status(400).json({ success: false, message: 'Invalid document type' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const driver = await Driver.findOne({ userId: getUserId(req) });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const oldPath = driver[field];
    driver[field] = `/uploads/${req.file.filename}`;
    await driver.save();

    if (oldPath) {
      const full = path.join(__dirname, '../../', oldPath.replace(/^\//, ''));
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      docType: req.params.docType,
      url: driver[field],
      documents: buildDocumentsResponse(driver),
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const field = DOC_FIELD_MAP[req.params.docType];
    if (!field) return res.status(400).json({ success: false, message: 'Invalid document type' });

    const driver = await Driver.findOne({ userId: getUserId(req) });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const oldPath = driver[field];
    driver[field] = undefined;
    await driver.save();

    if (oldPath) {
      const full = path.join(__dirname, '../../', oldPath.replace(/^\//, ''));
      if (fs.existsSync(full)) fs.unlinkSync(full);
    }

    res.json({ success: true, message: 'Document deleted', documents: buildDocumentsResponse(driver) });
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // 'online', 'offline', 'busy'
    if (!['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (driver.verificationStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Your driver account has not been approved by Admin yet' });
    }

    driver.status = status;
    await driver.save();

    res.status(200).json({ success: true, message: `Status updated to ${status}`, status: driver.status });
  } catch (error) {
    next(error);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide both latitude and longitude' });
    }

    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    driver.currentLocation = { lat, lng };
    await driver.save();

    res.status(200).json({ success: true, message: 'Location updated successfully', location: driver.currentLocation });
  } catch (error) {
    next(error);
  }
};

exports.getDriverEarnings = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Get all completed rides for this driver
    const completedRides = await Ride.find({ driverId: driver._id, status: 'completed' });

    let totalEarnings = 0;
    let dailyEarnings = 0;
    let weeklyEarnings = 0;
    let monthlyEarnings = 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); // Sunday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    completedRides.forEach(ride => {
      const fare = ride.fareDetails.finalFare;
      // Driver gets 85% of final fare, platform gets 15%
      const driverShare = fare * 0.85;

      totalEarnings += driverShare;

      const rideDate = new Date(ride.updatedAt);
      if (rideDate >= startOfToday) {
        dailyEarnings += driverShare;
      }
      if (rideDate >= startOfWeek) {
        weeklyEarnings += driverShare;
      }
      if (rideDate >= startOfMonth) {
        monthlyEarnings += driverShare;
      }
    });

    res.status(200).json({
      success: true,
      earnings: {
        total: Math.round(totalEarnings),
        daily: Math.round(dailyEarnings),
        weekly: Math.round(weeklyEarnings),
        monthly: Math.round(monthlyEarnings)
      },
      tripsCompleted: completedRides.length
    });
  } catch (error) {
    next(error);
  }
};

exports.getRideRequests = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ userId: req.user.id });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // A driver can see searching rides or ride requests assigned directly to them
    const rides = await Ride.find({
      $or: [
        { driverId: driver._id, status: { $in: ['assigned', 'arrived', 'started'] } },
        { status: 'searching', driverId: null } // pool of open rides
      ]
    }).populate('passengerId', 'name phone profilePhoto').sort({ createdAt: -1 });

    res.status(200).json({ success: true, rides });
  } catch (error) {
    next(error);
  }
};
