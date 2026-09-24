const mongoose = require('mongoose');

const LocationHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  accuracy: { type: Number },
  fullAddress: { type: String, default: '' },
  source: { type: String, enum: ['gps', 'manual', 'search', 'map_pin'], default: 'gps' },
  signalStatus: { type: String, enum: ['good', 'fair', 'poor', 'offline'], default: 'good' },
}, { timestamps: true });

LocationHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('LocationHistory', LocationHistorySchema);
