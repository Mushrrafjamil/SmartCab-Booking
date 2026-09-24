const mongoose = require('mongoose');

const SecurityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  event: { type: String, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  ipAddress: String,
  userAgent: String,
  details: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('SecurityLog', SecurityLogSchema);
