const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createCoupon, validateCoupon, getActiveCoupons, getAllCoupons, updateCoupon, deleteCoupon } = require('../controllers/couponController');

router.use(protect);

router.get('/active', getActiveCoupons);
router.post('/validate', validateCoupon);
router.get('/', authorize('admin', 'super_admin'), getAllCoupons);
router.post('/', authorize('admin', 'super_admin'), createCoupon);
router.put('/:id', authorize('admin', 'super_admin'), updateCoupon);
router.delete('/:id', authorize('admin', 'super_admin'), deleteCoupon);

module.exports = router;
