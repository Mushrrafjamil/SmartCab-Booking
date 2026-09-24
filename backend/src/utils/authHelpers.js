const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'supersecretkey123!', { expiresIn: '15m' });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id, sessionId: require('uuid').v4() }, process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey456!', { expiresIn: '7d' });

const hashOtp = async (otp) => bcrypt.hash(otp, 10);

const verifyOtpHash = async (otp, hash) => bcrypt.compare(otp, hash);

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const parseUserAgent = (ua = '') => {
  const browser = /Chrome/i.test(ua) ? 'Chrome' : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : /Edge/i.test(ua) ? 'Edge' : 'Unknown';
  const os = /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'macOS' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : /Linux/i.test(ua) ? 'Linux' : 'Unknown';
  return { browser, os, deviceName: `${browser} on ${os}` };
};

const getClientIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const validatePassword = (password) => PASSWORD_REGEX.test(password);

module.exports = {
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
};
