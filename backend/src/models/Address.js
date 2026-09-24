const mongoose = require('mongoose');

const AddressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['home', 'office', 'custom'], required: true },
  customLabel: { type: String, trim: true },
  displayLabel: { type: String, trim: true },

  houseFlatNumber: { type: String, trim: true },
  streetName: { type: String, trim: true },
  areaLocality: { type: String, trim: true },
  landmark: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true, default: 'India' },
  pincode: { type: String, trim: true },

  companyName: { type: String, trim: true },
  buildingName: { type: String, trim: true },
  floorNumber: { type: String, trim: true },
  officeNumber: { type: String, trim: true },

  fullAddress: { type: String, required: true, trim: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: { type: Number },

  isDefault: { type: Boolean, default: false },
  isDefaultPickup: { type: Boolean, default: false },
  isDefaultDrop: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },

  useCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

AddressSchema.index({ userId: 1, type: 1, isDeleted: 1 });
AddressSchema.index({ userId: 1, isFavorite: 1, isDeleted: 1 });
AddressSchema.index({ userId: 1, lastUsedAt: -1 });

module.exports = mongoose.model('Address', AddressSchema);
