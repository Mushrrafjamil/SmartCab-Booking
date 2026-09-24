const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['passenger', 'driver', 'admin', 'super_admin'], default: 'passenger' },
  profilePhoto: { type: String, default: '' },
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptTerms: { type: Boolean, default: false },
  walletBalance: { type: Number, default: 0 },
  emergencyContacts: [{ name: String, phone: String, relation: String, isPrimary: { type: Boolean, default: false } }],
  savedLocations: [{
    label: String,
    address: String,
    lat: Number,
    lng: Number,
  }],
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  passwordHistory: [{ type: String }],
  lastLogin: { type: Date },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    promotional: { type: Boolean, default: false },
  },
  refreshToken: { type: String, default: '' },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    if (!this.userId) this.userId = `USR${Date.now()}${Math.floor(Math.random() * 1000)}`;
    if (!this.referralCode) this.referralCode = `REF${Date.now().toString(36).toUpperCase()}`;
    return next();
  }
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.userId) this.userId = `USR${Date.now()}${Math.floor(Math.random() * 1000)}`;
  if (!this.referralCode) this.referralCode = `REF${Date.now().toString(36).toUpperCase()}`;
  next();
});

UserSchema.methods.comparePassword = async function (enteredPassword) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(enteredPassword, this.password);
};

UserSchema.methods.isLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordHistory;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
