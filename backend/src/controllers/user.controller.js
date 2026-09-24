const User = require('../models/User.model');
const Ride = require('../models/Ride.model');

const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favoriteDrivers');
    const upcomingRides = await Ride.find({
      user: req.user._id,
      status: { $in: ['pending', 'searching_driver', 'driver_assigned', 'driver_arrived', 'ride_started'] },
    }).populate('driver vehicle');
    res.json({ success: true, data: { user, upcomingRides } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const allowed = ['fullName', 'phone', 'email', 'profilePhoto', 'emergencyContacts'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addSavedLocation = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.savedLocations.push(req.body);
    await user.save();
    res.json({ success: true, data: user.savedLocations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRideHistory = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status === 'completed') filter.status = 'ride_completed';
    else if (status === 'cancelled') filter.status = 'cancelled';
    else if (status === 'upcoming') filter.status = { $in: ['pending', 'searching_driver', 'driver_assigned', 'driver_arrived'] };
    const rides = await Ride.find(filter).populate('driver vehicle payment').sort({ createdAt: -1 });
    res.json({ success: true, data: rides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  changePassword,
  addSavedLocation,
  getRideHistory,
};
