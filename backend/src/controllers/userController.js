const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Ride = require('../models/Ride');
const {
  logActivity,
  sendOtpRecord,
  verifyOtpRecord,
  validatePassword,
} = require('../services/authService');

const formatProfileUser = (user) => ({
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
  emergencyContacts: user.emergencyContacts,
  notificationPreferences: user.notificationPreferences,
  createdAt: user.createdAt,
});

exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    const upcomingRides = await Ride.find({
      passengerId: req.user.id,
      status: { $in: ['pending', 'searching', 'assigned', 'arrived', 'started'] },
    }).populate({
      path: 'driverId',
      populate: { path: 'userId', select: 'name phone profilePhoto' },
    }).populate('vehicleId').sort({ createdAt: -1 });

    res.status(200).json({ success: true, user, upcomingRides });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ success: true, user: formatProfileUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ success: false, message: 'Name is required' });
      user.name = name.trim();
    }

    await user.save();
    await logActivity(user._id, 'profile_updated', { fields: ['name'] }, req);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: formatProfileUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });

    if (user.profilePhoto) {
      const oldPath = path.join(__dirname, '../../', user.profilePhoto.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.profilePhoto = `/uploads/${req.file.filename}`;
    await user.save();
    await logActivity(user._id, 'profile_photo_updated', {}, req);

    res.status(200).json({
      success: true,
      message: 'Profile photo updated',
      user: formatProfileUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.removeProfilePhoto = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.profilePhoto) {
      const oldPath = path.join(__dirname, '../../', user.profilePhoto.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      user.profilePhoto = '';
      await user.save();
      await logActivity(user._id, 'profile_photo_removed', {}, req);
    }

    res.status(200).json({
      success: true,
      message: 'Profile photo removed',
      user: formatProfileUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.requestPhoneUpdateOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
    }

    const existing = await User.findOne({ phone, _id: { $ne: req.user.id }, isDeleted: false });
    if (existing) return res.status(400).json({ success: false, message: 'Phone number already in use' });

    const otp = await sendOtpRecord({ userId: req.user.id, phone, type: 'phone_update' });
    res.json({
      success: true,
      message: 'OTP sent to new phone number',
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp }),
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePhone = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
    }

    const result = await verifyOtpRecord({ phone, otp, type: 'phone_update' });
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    const existing = await User.findOne({ phone, _id: { $ne: req.user.id }, isDeleted: false });
    if (existing) return res.status(400).json({ success: false, message: 'Phone number already in use' });

    const user = await User.findById(req.user.id);
    user.phone = phone;
    user.isPhoneVerified = true;
    await user.save();
    await logActivity(user._id, 'phone_updated', { phone }, req);

    res.json({ success: true, message: 'Phone number updated', user: formatProfileUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.requestEmailUpdateOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Valid email required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id }, isDeleted: false });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

    const otp = await sendOtpRecord({ userId: req.user.id, email: email.toLowerCase(), type: 'email_update' });
    res.json({
      success: true,
      message: 'Verification code sent to new email',
      ...(process.env.NODE_ENV === 'development' && { devOtp: otp }),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email?.toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Valid email required' });
    }

    const result = await verifyOtpRecord({ email: normalizedEmail, otp, type: 'email_update' });
    if (!result.valid) return res.status(400).json({ success: false, message: result.message });

    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id }, isDeleted: false });
    if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

    const user = await User.findById(req.user.id);
    user.email = normalizedEmail;
    user.isEmailVerified = true;
    await user.save();
    await logActivity(user._id, 'email_updated', { email: normalizedEmail }, req);

    res.json({ success: true, message: 'Email updated', user: formatProfileUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Password must have uppercase, lowercase, number and special character' });
    }

    const user = await User.findById(req.user.id);
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    for (const oldHash of user.passwordHistory || []) {
      if (await bcrypt.compare(newPassword, oldHash)) {
        return res.status(400).json({ success: false, message: 'Cannot reuse a previous password' });
      }
    }

    user.passwordHistory = [...(user.passwordHistory || []), user.password].slice(-5);
    user.password = newPassword;
    await user.save();
    await logActivity(user._id, 'password_changed', {}, req);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.addWalletFunds = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid deposit amount' });
    }

    const user = await User.findById(req.user.id);
    user.walletBalance += Number(amount);
    await user.save();

    await Transaction.create({
      userId: user._id,
      amount,
      type: 'credit',
      description: 'Wallet Refill via Card/UPI',
      status: 'success',
    });

    res.status(200).json({
      success: true,
      message: `${amount} credited to your wallet`,
      walletBalance: user.walletBalance,
    });
  } catch (error) {
    next(error);
  }
};

exports.getWalletTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    next(error);
  }
};

exports.getSavedLocations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, savedLocations: user.savedLocations });
  } catch (error) {
    next(error);
  }
};

exports.saveLocation = async (req, res, next) => {
  try {
    const { label, address, lat, lng } = req.body;
    if (!label || !address || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide label, address, lat, and lng' });
    }

    const user = await User.findById(req.user.id);
    user.savedLocations = user.savedLocations.filter((loc) => loc.label.toLowerCase() !== label.toLowerCase());
    user.savedLocations.push({ label, address, lat, lng });
    await user.save();
    res.status(200).json({ success: true, message: 'Location saved successfully', savedLocations: user.savedLocations });
  } catch (error) {
    next(error);
  }
};

exports.deleteSavedLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    user.savedLocations = user.savedLocations.filter((loc) => loc._id.toString() !== id);
    await user.save();
    res.status(200).json({ success: true, message: 'Location deleted successfully', savedLocations: user.savedLocations });
  } catch (error) {
    next(error);
  }
};

exports.getEmergencyContacts = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, emergencyContacts: user.emergencyContacts });
  } catch (error) {
    next(error);
  }
};

exports.addEmergencyContact = async (req, res, next) => {
  try {
    const { name, phone, relation } = req.body;
    if (!name?.trim() || !phone || !relation?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, phone and relation are required' });
    }
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
    }

    const user = await User.findById(req.user.id);
    if (user.emergencyContacts.some((c) => c.phone === phone)) {
      return res.status(400).json({ success: false, message: 'Contact already exists' });
    }

    const isPrimary = user.emergencyContacts.length === 0 || req.body.isPrimary === true;
    if (isPrimary) {
      user.emergencyContacts.forEach((c) => { c.isPrimary = false; });
    }

    user.emergencyContacts.push({ name: name.trim(), phone, relation: relation.trim(), isPrimary });
    await user.save();
    await logActivity(user._id, 'emergency_contact_added', { name, phone }, req);

    res.status(200).json({ success: true, message: 'Emergency contact added', emergencyContacts: user.emergencyContacts });
  } catch (error) {
    next(error);
  }
};

exports.updateEmergencyContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, relation } = req.body;
    const user = await User.findById(req.user.id);
    const contact = user.emergencyContacts.id(id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    if (name) contact.name = name.trim();
    if (relation) contact.relation = relation.trim();
    if (phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number required' });
      }
      if (user.emergencyContacts.some((c) => c.phone === phone && c._id.toString() !== id)) {
        return res.status(400).json({ success: false, message: 'Phone already used by another contact' });
      }
      contact.phone = phone;
    }

    await user.save();
    await logActivity(user._id, 'emergency_contact_updated', { contactId: id }, req);
    res.status(200).json({ success: true, message: 'Contact updated', emergencyContacts: user.emergencyContacts });
  } catch (error) {
    next(error);
  }
};

exports.setPrimaryEmergencyContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    const contact = user.emergencyContacts.id(id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    user.emergencyContacts.forEach((c) => { c.isPrimary = c._id.toString() === id; });
    await user.save();
    await logActivity(user._id, 'emergency_contact_primary_set', { contactId: id }, req);

    res.status(200).json({ success: true, message: 'Primary contact updated', emergencyContacts: user.emergencyContacts });
  } catch (error) {
    next(error);
  }
};

exports.deleteEmergencyContact = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    const contact = user.emergencyContacts.id(id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    const wasPrimary = contact.isPrimary;
    user.emergencyContacts.pull(id);
    if (wasPrimary && user.emergencyContacts.length > 0) {
      user.emergencyContacts[0].isPrimary = true;
    }
    await user.save();
    await logActivity(user._id, 'emergency_contact_deleted', { contactId: id }, req);

    res.status(200).json({ success: true, message: 'Contact removed', emergencyContacts: user.emergencyContacts });
  } catch (error) {
    next(error);
  }
};
