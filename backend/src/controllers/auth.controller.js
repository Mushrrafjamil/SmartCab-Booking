const User = require('../models/User.model');
const Driver = require('../models/Driver.model');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');

const registerUser = async (req, res) => {
  try {
    const { fullName, email, phone, password, referralCode } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email or phone already registered' });
    }
    const userReferralCode = `REF${Date.now().toString(36).toUpperCase()}`;
    const user = await User.create({
      fullName,
      email,
      phone,
      password,
      referralCode: userReferralCode,
      referredBy: referralCode ? await User.findOne({ referralCode })?.then((u) => u?._id) : undefined,
    });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const registerDriver = async (req, res) => {
  try {
    const { fullName, email, phone, password, licenseNumber, aadhaarNumber, panNumber } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email or phone already registered' });
    }
    const user = await User.create({ fullName, email, phone, password, role: 'driver' });
    const driver = await Driver.create({
      user: user._id,
      licenseNumber,
      aadhaarNumber,
      panNumber,
    });
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    res.status(201).json({ success: true, data: { user, driver, accessToken, refreshToken } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshToken = refreshToken;
    await user.save();
    let driver = null;
    if (user.role === 'driver') {
      driver = await Driver.findOne({ user: user._id }).populate('vehicle');
    }
    res.json({ success: true, data: { user, driver, accessToken, refreshToken } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const logout = async (req, res) => {
  try {
    req.user.refreshToken = undefined;
    await req.user.save();
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Refresh token required' });
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }
    const accessToken = generateAccessToken(user._id);
    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpire = Date.now() + 10 * 60 * 1000;
    await user.save();
    res.json({ success: true, message: 'OTP sent to email', ...(process.env.NODE_ENV === 'development' && { otp }) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email, otp, otpExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp, type } = req.body;
    const user = await User.findOne({ email, otp, otpExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    if (type === 'email') user.isEmailVerified = true;
    if (type === 'phone') user.isPhoneVerified = true;
    user.otp = undefined;
    user.otpExpire = undefined;
    await user.save();
    res.json({ success: true, message: 'Verification successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  registerDriver,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyOtp,
};
