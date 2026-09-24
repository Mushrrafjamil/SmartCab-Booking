const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: String,
    reviewType: {
      type: String,
      enum: ['user_to_driver', 'driver_to_user', 'user_to_vehicle'],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
