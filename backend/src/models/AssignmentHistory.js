const mongoose = require('mongoose');

const AssignmentHistorySchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  assignedBy: { type: String, enum: ['system', 'admin', 'dispatcher'], default: 'system' },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['auto', 'manual', 'reassign'], default: 'auto' },
  status: { type: String, enum: ['offered', 'accepted', 'rejected', 'timeout', 'cancelled', 'reassigned'], default: 'offered' },
  reason: { type: String, default: '' },
  distanceKm: { type: Number },
  etaMinutes: { type: Number },
  driverRating: { type: Number },
  respondedAt: { type: Date },
}, { timestamps: true });

AssignmentHistorySchema.index({ rideId: 1, createdAt: -1 });
AssignmentHistorySchema.index({ driverId: 1, createdAt: -1 });

module.exports = mongoose.model('AssignmentHistory', AssignmentHistorySchema);
