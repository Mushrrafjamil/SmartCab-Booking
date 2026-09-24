const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

router.use(protect);
router.use(authorize('admin', 'super_admin'));

router.get('/users', reportController.getUserReport);
router.get('/drivers', reportController.getDriverReport);
router.get('/rides', reportController.getRideReport);
router.get('/revenue', reportController.getRevenueReport);
router.get('/payments', reportController.getPaymentReport);
router.get('/vehicles', reportController.getVehicleReport);
router.get('/coupons', reportController.getCouponReport);
router.get('/refunds', reportController.getRefundReport);

module.exports = router;
