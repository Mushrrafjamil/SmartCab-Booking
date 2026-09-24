const User = require('../models/User');
const Driver = require('../models/Driver');
const Session = require('../models/Session');
const LoginHistory = require('../models/LoginHistory');
const bcrypt = require('bcryptjs');
const {
  logActivity,
  logSecurity,
  recordLogin,
  sendOtpRecord,
  verifyOtpRecord,
  issueTokens,
  formatUserResponse,
  createDefaultResources,
  validatePassword,
  AADHAAR_REGEX,
  PAN_REGEX,
  LOCK_TIME_MS,
  MAX_LOGIN_ATTEMPTS,
} = require('../services/authService');

// ─── USER REGISTRATION ───────────────────────────────────────────
exports.registerUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, confirmPassword, referralCode, acceptTerms } = req.body;
    if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (!validatePassword(password)) return res.status(400).json({ success: false, message: 'Password must have uppercase, lowercase, number and special character' });

    const exists = await User.findOne({ $or: [{ email }, { phone }], isDeleted: false });
    if (exists) return res.status(400).json({ success: false, message: 'Email or phone already registered' });

    let referredBy;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode, isDeleted: false });
      if (referrer) referredBy = referrer._id;
    }

    const profilePhoto = req.file ? `/uploads/${req.file.filename}` : '';
    const user = await User.create({
      name, email, phone, password, acceptTerms: acceptTerms === 'true' || acceptTerms === true,
      profilePhoto, referredBy, role: 'passenger',
    });

    await createDefaultResources(user);
    const phoneOtp = await sendOtpRecord({ userId: user._id, phone, type: 'phone' });
    const emailOtp = await sendOtpRecord({ userId: user._id, email, type: 'email' });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify OTP.',
      requiresVerification: true,
      user: await formatUserResponse(user),
      ...(process.env.NODE_ENV === 'development' && { devOtps: { phone: phoneOtp, email: emailOtp } }),
    });
  } catch (error) { next(error); }
};

// ─── DRIVER MULTI-STEP REGISTRATION ──────────────────────────────
exports.registerDriverStep = async (req, res, next) => {
  try {
    const step = parseInt(req.params.step);
    const files = req.files || {};

    if (step === 1) {
      const { name, email, phone, password, confirmPassword, dateOfBirth, gender, address, city, state, pincode } = req.body;
      if (password !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
      if (!validatePassword(password)) return res.status(400).json({ success: false, message: 'Weak password' });

      const exists = await User.findOne({ $or: [{ email }, { phone }] });
      if (exists) return res.status(400).json({ success: false, message: 'Email or phone already registered' });

      const user = await User.create({ name, email, phone, password, role: 'driver', acceptTerms: true });
      const driver = await Driver.create({
        userId: user._id, dateOfBirth, gender, address, city, state, pincode, registrationStep: 2,
      });
      await createDefaultResources(user);
      return res.status(201).json({ success: true, message: 'Step 1 complete', userId: user._id, driverId: driver._id, nextStep: 2 });
    }

    const { userId } = req.body;
    const user = await User.findById(userId);
    const driver = await Driver.findOne({ userId });
    if (!user || !driver) return res.status(404).json({ success: false, message: 'Registration session not found' });

    const filePath = (field) => files[field]?.[0] ? `/uploads/${files[field][0].filename}` : undefined;

    if (step === 2) {
      const { aadhaarNumber, panNumber } = req.body;
      if (!AADHAAR_REGEX.test(aadhaarNumber)) return res.status(400).json({ success: false, message: 'Invalid Aadhaar format' });
      if (!PAN_REGEX.test(panNumber)) return res.status(400).json({ success: false, message: 'Invalid PAN format' });
      Object.assign(driver, {
        aadhaarNumber, panNumber,
        aadhaarFront: filePath('aadhaarFront'),
        aadhaarBack: filePath('aadhaarBack'),
        panCardImage: filePath('panCardImage'),
        registrationStep: 3,
      });
    } else if (step === 3) {
      const { licenseNumber, licenseExpiry } = req.body;
      Object.assign(driver, {
        licenseNumber, licenseExpiry,
        licenseFront: filePath('licenseFront'),
        licenseBack: filePath('licenseBack'),
        registrationStep: 4,
      });
    } else if (step === 4) {
      const { vehicleType, vehicleBrand, vehicleModel, vehicleNumber, vehicleColor, manufacturingYear } = req.body;
      Object.assign(driver, {
        vehicleType, vehicleBrand, vehicleModel, vehicleNumber, vehicleColor,
        manufacturingYear: parseInt(manufacturingYear), registrationStep: 5,
      });
    } else if (step === 5) {
      Object.assign(driver, {
        rcBook: filePath('rcBook'),
        insuranceCertificate: filePath('insuranceCertificate'),
        pollutionCertificate: filePath('pollutionCertificate'),
        fitnessCertificate: filePath('fitnessCertificate'),
        vehicleImages: files.vehicleImages?.map((f) => `/uploads/${f.filename}`) || [],
        registrationStep: 6,
      });
    } else if (step === 6) {
      const { emergencyName, emergencyPhone, emergencyRelation, bankAccount, ifscCode, upiId } = req.body;
      Object.assign(driver, {
        profilePhoto: filePath('profilePhoto'),
        selfieVerification: filePath('selfieVerification'),
        emergencyContact: { name: emergencyName, phone: emergencyPhone, relation: emergencyRelation },
        bankAccount, ifscCode, upiId, registrationStep: 7,
      });
      if (driver.profilePhoto) {
        user.profilePhoto = driver.profilePhoto;
        await user.save();
      }
    } else if (step === 7) {
      driver.verificationStatus = 'under_review';
      driver.registrationStep = 7;
      const phoneOtp = await sendOtpRecord({ userId: user._id, phone: user.phone, type: 'phone' });
      return res.json({
        success: true,
        message: 'Registration submitted for review. Verify your phone OTP.',
        requiresVerification: true,
        ...(process.env.NODE_ENV === 'development' && { devOtp: phoneOtp }),
      });
    }

    await driver.save();
    res.json({ success: true, message: `Step ${step} saved`, nextStep: driver.registrationStep });
  } catch (error) { next(error); }
};

// ─── LOGIN (email / phone / password) ────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = email || phone;
    if (!identifier || !password) return res.status(400).json({ success: false, message: 'Credentials required' });

    const user = await User.findOne(email ? { email } : { phone });
    if (!user || user.isDeleted) {
      await logSecurity(null, 'login_failed', 'medium', req, { identifier });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isSuspended) return res.status(403).json({ success: false, message: 'Account suspended' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated' });
    if (user.isLocked()) return res.status(423).json({ success: false, message: 'Account locked. Try again later.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      await user.save();
      await recordLogin(user._id, req, false, email ? 'email' : 'phone', 'Invalid password');
      await logSecurity(user._id, 'failed_login', 'high', req);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.role === 'driver') {
      const driver = await Driver.findOne({ userId: user._id });
      if (!driver || driver.verificationStatus !== 'approved') {
        return res.status(403).json({ success: false, message: 'Driver account pending approval', driverStatus: driver?.verificationStatus });
      }
    }

    const tokens = await issueTokens(user, req);
    await recordLogin(user._id, req, true, email ? 'email' : 'phone');
    await logActivity(user._id, 'login', {}, req);

    res.json({ success: true, ...tokens, user: await formatUserResponse(user) });
  } catch (error) { next(error); }
};

// ─── OTP LOGIN ───────────────────────────────────────────────────
exports.loginWithOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({ phone, isDeleted: false });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const result = await verifyOtpRecord({ phone, otp, type: 'phone' });
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    user.isPhoneVerified = true;
    await user.save();
    const tokens = await issueTokens(user, req);
    await recordLogin(user._id, req, true, 'otp');

    res.json({ success: true, ...tokens, user: await formatUserResponse(user) });
  } catch (error) { next(error); }
};

exports.sendLoginOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ phone, isDeleted: false });
    if (!user) return res.status(404).json({ success: false, message: 'Phone not registered' });
    const otp = await sendOtpRecord({ userId: user._id, phone, type: 'phone' });
    res.json({ success: true, message: 'OTP sent', ...(process.env.NODE_ENV === 'development' && { devOtp: otp }) });
  } catch (error) { next(error); }
};

// ─── VERIFY OTP (email / phone) ───────────────────────────────────
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, phone, otp, type } = req.body;
    const result = await verifyOtpRecord({ email, phone, otp, type });
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    const user = await User.findOne(email ? { email } : { phone });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (type === 'email') user.isEmailVerified = true;
    if (type === 'phone') user.isPhoneVerified = true;
    await user.save();

    let tokens = null;
    if (user.isEmailVerified && user.isPhoneVerified) {
      tokens = await issueTokens(user, req);
    }

    res.json({
      success: true,
      message: 'Verification successful',
      user: await formatUserResponse(user),
      ...(tokens && tokens),
    });
  } catch (error) { next(error); }
};

exports.resendOtp = async (req, res, next) => {
  try {
    const { email, phone, type } = req.body;
    const user = await User.findOne(email ? { email } : { phone });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const otp = await sendOtpRecord({ userId: user._id, email, phone, type });
    res.json({ success: true, message: 'OTP resent', ...(process.env.NODE_ENV === 'development' && { devOtp: otp }) });
  } catch (error) { next(error); }
};

// ─── FORGOT / RESET PASSWORD ─────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, phone } = req.body;
    const user = await User.findOne(email ? { email } : { phone });
    if (!user) return res.status(404).json({ success: false, message: 'Account not found' });
    const otp = await sendOtpRecord({ userId: user._id, email: user.email, phone: user.phone, type: 'password_reset' });
    res.json({ success: true, message: 'Reset OTP sent', ...(process.env.NODE_ENV === 'development' && { devOtp: otp }) });
  } catch (error) { next(error); }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, phone, otp, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) return res.status(400).json({ success: false, message: 'Passwords do not match' });
    if (!validatePassword(newPassword)) return res.status(400).json({ success: false, message: 'Weak password' });

    const result = await verifyOtpRecord({ email, phone, otp, type: 'password_reset' });
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    const user = await User.findOne(email ? { email } : { phone });
    for (const oldHash of user.passwordHistory || []) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return res.status(400).json({ success: false, message: 'Cannot reuse a previous password' });
      }
    }

    user.passwordHistory = [...(user.passwordHistory || []), user.password].slice(-5);
    user.password = newPassword;
    user.refreshToken = '';
    await user.save();
    await Session.updateMany({ userId: user._id }, { isActive: false, logoutAt: new Date() });
    await logActivity(user._id, 'password_reset');

    res.json({ success: true, message: 'Password reset successful. Please login.' });
  } catch (error) { next(error); }
};

// ─── CURRENT USER ────────────────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    res.json({ success: true, user: await formatUserResponse(req.user) });
  } catch (error) { next(error); }
};

// ─── REFRESH TOKEN (with rotation) ───────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Refresh token required' });

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey456!');
    const user = await User.findById(decoded.id);
    const session = await Session.findOne({ refreshToken: token, isActive: true });

    if (!user || !session || user.refreshToken !== token) {
      if (user) await logSecurity(user._id, 'token_reuse_detected', 'critical', req);
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    session.isActive = false;
    session.logoutAt = new Date();
    await session.save();

    const tokens = await issueTokens(user, req);
    res.json({ success: true, ...tokens });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token refresh failed' });
  }
};

// ─── LOGOUT ──────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { token, allDevices } = req.body;
    const user = await User.findOne({ refreshToken: token });
    if (user) {
      if (allDevices) {
        await Session.updateMany({ userId: user._id, isActive: true }, { isActive: false, logoutAt: new Date() });
        user.refreshToken = '';
      } else {
        await Session.updateOne({ refreshToken: token }, { isActive: false, logoutAt: new Date() });
      }
      await user.save();
      await logActivity(user._id, allDevices ? 'logout_all_devices' : 'logout');
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) { next(error); }
};

// ─── SESSIONS ────────────────────────────────────────────────────
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id, isActive: true }).sort({ lastActivity: -1 });
    res.json({ success: true, data: sessions });
  } catch (error) { next(error); }
};

exports.revokeSession = async (req, res, next) => {
  try {
    await Session.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isActive: false, logoutAt: new Date() }
    );
    res.json({ success: true, message: 'Session revoked' });
  } catch (error) { next(error); }
};

exports.getLoginHistory = async (req, res, next) => {
  try {
    const history = await LoginHistory.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: history });
  } catch (error) { next(error); }
};

// Keep legacy register for backward compatibility
exports.register = exports.registerUser;
