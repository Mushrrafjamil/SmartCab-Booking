const ActivityLog = require('../models/ActivityLog');
const SecurityLog = require('../models/SecurityLog');
const LoginHistory = require('../models/LoginHistory');
const Session = require('../models/Session');
const OtpVerification = require('../models/OtpVerification');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Driver = require('../models/Driver');
const {
  generateAccessToken,
  generateRefreshToken,
  hashOtp,
  verifyOtpHash,
  generateOtp,
  parseUserAgent,
  getClientIp,
  validatePassword,
  AADHAAR_REGEX,
  PAN_REGEX,
} = require('../utils/authHelpers');

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const LOCK_TIME_MS = 30 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

const logActivity = async (userId, action, details = {}, ipOrReq) => {
  const ip = typeof ipOrReq === 'string' ? ipOrReq : ipOrReq ? getClientIp(ipOrReq) : undefined;
  await ActivityLog.create({ userId, action, details, ipAddress: ip });
};

const logSecurity = async (userId, event, severity, req, details = {}) => {
  await SecurityLog.create({
    userId,
    event,
    severity,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'],
    details,
  });
};

const createSession = async (user, refreshToken, req) => {
  const ua = parseUserAgent(req.headers['user-agent']);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return Session.create({
    userId: user._id,
    refreshToken,
    deviceName: ua.deviceName,
    browser: ua.browser,
    os: ua.os,
    ipAddress: getClientIp(req),
    expiresAt,
  });
};

const recordLogin = async (userId, req, success, loginType = 'email', failureReason) => {
  const ua = parseUserAgent(req.headers['user-agent']);
  await LoginHistory.create({
    userId,
    loginType,
    deviceName: ua.deviceName,
    browser: ua.browser,
    os: ua.os,
    ipAddress: getClientIp(req),
    success,
    failureReason,
  });
};

const sendOtpRecord = async ({ userId, email, phone, type }) => {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  await OtpVerification.deleteMany({ $or: [{ email }, { phone }], type, isUsed: false });
  await OtpVerification.create({
    userId,
    email,
    phone,
    otpHash,
    type,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  });
  return otp;
};

const verifyOtpRecord = async ({ email, phone, otp, type }) => {
  const record = await OtpVerification.findOne({
    $or: [{ email }, { phone }],
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!record) return { valid: false, message: 'OTP expired or not found' };
  if (record.attempts >= record.maxAttempts) return { valid: false, message: 'Maximum OTP attempts exceeded' };

  const match = await verifyOtpHash(otp, record.otpHash);
  if (!match) {
    record.attempts += 1;
    await record.save();
    return { valid: false, message: 'Invalid OTP' };
  }

  record.isUsed = true;
  await record.save();
  return { valid: true, record };
};

const issueTokens = async (user, req) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  await createSession(user, refreshToken, req);
  return { accessToken, refreshToken };
};

const formatUserResponse = async (user) => {
  let driverStatus = null;
  if (user.role === 'driver') {
    const driver = await Driver.findOne({ userId: user._id });
    driverStatus = driver?.verificationStatus || 'pending';
  }
  return {
    id: user._id,
    userId: user.userId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profilePhoto: user.profilePhoto,
    walletBalance: user.walletBalance,
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    referralCode: user.referralCode,
    driverStatus,
  };
};

const createDefaultResources = async (user) => {
  await Notification.create({
    userId: user._id,
    title: 'Welcome to CabBook!',
    message: 'Your account has been created. Verify your email and phone to unlock all features.',
    type: 'system',
    read: false,
  });
  await logActivity(user._id, 'user_registered', { role: user.role });
};

module.exports = {
  logActivity,
  logSecurity,
  createSession,
  recordLogin,
  sendOtpRecord,
  verifyOtpRecord,
  issueTokens,
  formatUserResponse,
  createDefaultResources,
  validatePassword,
  AADHAAR_REGEX,
  PAN_REGEX,
  OTP_EXPIRY_MS,
  LOCK_TIME_MS,
  MAX_LOGIN_ATTEMPTS,
};
