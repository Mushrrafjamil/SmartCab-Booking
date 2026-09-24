const Review = require('../models/Review.model');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');

const getUserId = (req) => req.user._id || req.user.id;

exports.createReview = async (req, res, next) => {
  try {
    const { rideId, rating, comment, reviewType, issueReported } = req.body;
    if (!rideId || !rating) {
      return res.status(400).json({ success: false, message: 'Ride ID and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only review completed rides' });
    }

    const type = reviewType || (req.user.role === 'driver' ? 'driver_to_user' : 'user_to_driver');
    const existing = await Review.findOne({ ride: rideId, reviewer: getUserId(req), reviewType: type });
    if (existing) return res.status(409).json({ success: false, message: 'You already reviewed this ride' });

    const review = await Review.create({
      ride: rideId,
      reviewer: getUserId(req),
      reviewee: type === 'driver_to_user' ? ride.passengerId : undefined,
      driver: ride.driverId,
      vehicle: ride.vehicleId,
      rating: Number(rating),
      comment: comment || '',
      reviewType: type,
    });

    if (type === 'user_to_driver' && ride.driverId) {
      const reviews = await Review.find({ driver: ride.driverId, reviewType: 'user_to_driver' });
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      await Driver.findByIdAndUpdate(ride.driverId, {
        rating: Math.round(avg * 10) / 10,
        ratingCount: reviews.length,
      });
      ride.driverRating = { rating: Number(rating), comment, issueReported: !!issueReported };
    } else if (type === 'driver_to_user') {
      ride.passengerRating = { rating: Number(rating), comment };
    }
    await ride.save();

    res.status(201).json({ success: true, message: 'Review submitted', review });
  } catch (error) {
    next(error);
  }
};

exports.getReviews = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.driver) filter.driver = req.query.driver;
    if (req.query.ride) filter.ride = req.query.ride;
    if (req.query.reviewType) filter.reviewType = req.query.reviewType;
    if (req.query.reviewer) filter.reviewer = req.query.reviewer;

    const reviews = await Review.find(filter)
      .populate('reviewer', 'name profilePhoto')
      .populate('driver')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 50);

    res.json({ success: true, reviews });
  } catch (error) {
    next(error);
  }
};

exports.getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewer: getUserId(req) })
      .populate('ride', 'rideId pickup destination')
      .sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (error) {
    next(error);
  }
};
