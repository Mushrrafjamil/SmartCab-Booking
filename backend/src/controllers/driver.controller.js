const Driver = require('../models/Driver.model');
const Ride = require('../models/Ride.model');

const getDashboard = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id }).populate('user vehicle');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver profile not found' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRides = await Ride.find({
      driver: driver._id,
      status: 'ride_completed',
      completedAt: { $gte: today },
    });
    const todayEarnings = todayRides.reduce((sum, r) => sum + (r.fare?.total || 0), 0);
    const pendingRides = await Ride.find({ driver: driver._id, status: 'driver_assigned' });
    res.json({
      success: true,
      data: { driver, todayEarnings, pendingRides, completedToday: todayRides.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleOnlineStatus = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    driver.isOnline = !driver.isOnline;
    await driver.save();
    res.json({ success: true, data: { isOnline: driver.isOnline } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const driver = await Driver.findOneAndUpdate(
      { user: req.user._id },
      { currentLocation: { type: 'Point', coordinates: [longitude, latitude] } },
      { new: true }
    );
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRideRequests = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    const rides = await Ride.find({
      status: 'searching_driver',
      ...(driver?.vehicle?.vehicleType && { vehicleType: driver.vehicle.vehicleType }),
    }).populate('user');
    res.json({ success: true, data: rides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const acceptRide = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id }).populate('vehicle');
    const ride = await Ride.findById(req.params.id);
    if (!ride || ride.status !== 'searching_driver') {
      return res.status(400).json({ success: false, message: 'Ride not available' });
    }
    ride.driver = driver._id;
    ride.vehicle = driver.vehicle?._id;
    ride.status = 'driver_assigned';
    await ride.save();
    if (driver.vehicle) {
      const Vehicle = require('../models/Vehicle.model');
      await Vehicle.findByIdAndUpdate(driver.vehicle._id, { status: 'busy' });
    }
    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rejectRide = async (req, res) => {
  res.json({ success: true, message: 'Ride rejected' });
};

const getEarnings = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id });
    const { period } = req.query;
    let startDate = new Date();
    if (period === 'weekly') startDate.setDate(startDate.getDate() - 7);
    else if (period === 'monthly') startDate.setMonth(startDate.getMonth() - 1);
    else startDate.setHours(0, 0, 0, 0);
    const rides = await Ride.find({
      driver: driver._id,
      status: 'ride_completed',
      completedAt: { $gte: startDate },
    });
    const total = rides.reduce((sum, r) => sum + (r.fare?.total || 0), 0);
    res.json({ success: true, data: { total, rides: rides.length, period: period || 'daily' } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const driver = await Driver.findOne({ user: req.user._id }).populate('user vehicle');
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const driver = await Driver.findOneAndUpdate({ user: req.user._id }, req.body, { new: true });
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  toggleOnlineStatus,
  updateLocation,
  getRideRequests,
  acceptRide,
  rejectRide,
  getEarnings,
  getProfile,
  updateProfile,
};
