const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/', protect, couponController.getCoupons);
router.get('/validate/:code', protect, couponController.validateCoupon);
router.post('/', protect, authorize('admin'), couponController.createCoupon);
router.delete('/:id', protect, authorize('admin'), couponController.deleteCoupon);

module.exports = router;
