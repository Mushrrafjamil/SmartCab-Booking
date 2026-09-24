const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', reviewController.createReview);
router.get('/', reviewController.getReviews);

module.exports = router;
