const User = require('../models/User');
const Driver = require('../models/Driver');
const Session = require('../models/Session');
const LoginHistory = require('../models/LoginHistory');
const SecurityLog = require('../models/SecurityLog');
const OtpVerification = require('../models/OtpVerification');
const ActivityLog = require('../models/ActivityLog');
const { logActivity } = require('../services/authService');

// Extend existing admin controller with auth management

exports.suspendAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isSuspended = !user.isSuspended;
    if (user.isSuspended) {
      user.refreshToken = '';
      await Session.updateMany({ userId: user._id }, { isActive: false, logoutAt: new Date() });
    }
    await user.save();
    await logActivity(user._id, user.isSuspended ? 'account_suspended' : 'account_activated', {}, req);
    res.json({ success: true, message: user.isSuspended ? 'Account suspended' : 'Account activated', user });
  } catch (error) { next(error); }
};

exports.forceLogout = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.refreshToken = '';
    await user.save();
    await Session.updateMany({ userId: user._id, isActive: true }, { isActive: false, logoutAt: new Date() });
    await logActivity(user._id, 'force_logout_by_admin', { adminId: req.user._id });
    res.json({ success: true, message: 'User logged out from all devices' });
  } catch (error) { next(error); }
};

exports.getUserLoginHistory = async (req, res, next) => {
  try {
    const filter = req.params.userId ? { userId: req.params.userId } : {};
    const history = await LoginHistory.find(filter).populate('userId', 'name email phone role').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: history });
  } catch (error) { next(error); }
};

exports.getSecurityLogs = async (req, res, next) => {
  try {
    const logs = await SecurityLog.find().populate('userId', 'name email').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
};

exports.getOtpLogs = async (req, res, next) => {
  try {
    const logs = await OtpVerification.find().select('-otpHash').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
};

exports.getActivityLogs = async (req, res, next) => {
  try {
    const filter = req.params.userId ? { userId: req.params.userId } : {};
    const logs = await ActivityLog.find(filter).populate('userId', 'name email').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
};

exports.reviewDriver = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const allowed = ['approved', 'rejected', 'under_review'];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

    const driver = await Driver.findById(req.params.driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    driver.verificationStatus = status;
    if (remarks) driver.adminRemarks = remarks;
    if (status !== 'approved') driver.status = 'offline';
    await driver.save();

    await logActivity(driver.userId, `driver_${status}`, { remarks, adminId: req.user._id });
    res.json({ success: true, message: `Driver ${status}`, driver });
  } catch (error) { next(error); }
};

exports.searchAccounts = async (req, res, next) => {
  try {
    const { q, role, status } = req.query;
    const filter = { isDeleted: false };
    if (role) filter.role = role;
    if (status === 'suspended') filter.isSuspended = true;
    if (status === 'active') filter.isActive = true;
    if (q) {
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') },
        { userId: new RegExp(q, 'i') },
      ];
    }
    const users = await User.find(filter).select('-password -refreshToken -passwordHistory').sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: users });
  } catch (error) { next(error); }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isDeleted = true;
    user.isActive = false;
    user.refreshToken = '';
    await user.save();
    await Session.updateMany({ userId: user._id }, { isActive: false, logoutAt: new Date() });
    res.json({ success: true, message: 'Account deleted (soft)' });
  } catch (error) { next(error); }
};

exports.restoreAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isDeleted = false;
    user.isActive = true;
    await user.save();
    res.json({ success: true, message: 'Account restored' });
  } catch (error) { next(error); }
};
