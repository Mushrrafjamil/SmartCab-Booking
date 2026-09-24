const User = require('../models/User.model');
const Driver = require('../models/Driver.model');
const Vehicle = require('../models/Vehicle.model');
const Ride = require('../models/Ride.model');
const Payment = require('../models/Payment.model');

const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [totalUsers, totalDrivers, activeDrivers, activeVehicles, todayRides, pendingDrivers] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Driver.countDocuments(),
      Driver.countDocuments({ isOnline: true, isApproved: true }),
      Vehicle.countDocuments({ status: 'available' }),
      Ride.countDocuments({ createdAt: { $gte: today } }),
      Driver.countDocuments({ status: 'pending' }),
    ]);
    const revenue = await Payment.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    res.json({
      success: true,
      data: {
        totalUsers,
        totalDrivers,
        activeDrivers,
        activeVehicles,
        todayRides,
        todayRevenue: revenue[0]?.total || 0,
        pendingApprovals: pendingDrivers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const suspendUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isSuspended: true }, { new: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().populate('user vehicle').sort({ createdAt: -1 });
    res.json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const approveDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { isApproved: true, status: 'approved' },
      { new: true }
    );
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rejectDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboard, getUsers, suspendUser, getDrivers, approveDriver, rejectDriver };
