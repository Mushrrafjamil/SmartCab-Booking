const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

router.use(protect);

router.get('/mine', reviewController.getMyReviews);
router.post('/', reviewController.createReview);
router.get('/', reviewController.getReviews);

module.exports = router;
