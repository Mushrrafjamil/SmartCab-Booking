const Review = require('../models/Review.model');
const Driver = require('../models/Driver.model');

const createReview = async (req, res) => {
  try {
    const review = await Review.create({ ...req.body, reviewer: req.user._id });
    if (req.body.reviewType === 'user_to_driver' && req.body.driver) {
      const reviews = await Review.find({ driver: req.body.driver, reviewType: 'user_to_driver' });
      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
      await Driver.findByIdAndUpdate(req.body.driver, { rating: Math.round(avgRating * 10) / 10 });
    }
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getReviews = async (req, res) => {
  try {
    const filter = {};
    if (req.query.driver) filter.driver = req.query.driver;
    if (req.query.ride) filter.ride = req.query.ride;
    const reviews = await Review.find(filter).populate('reviewer', 'fullName profilePhoto').sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createReview, getReviews };
