const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.post('/:rideId', paymentController.processPayment);
router.get('/transactions', paymentController.getTransactions);
router.get('/:id', paymentController.getPayment);
router.post('/:id/refund', authorize('admin'), paymentController.refundPayment);

module.exports = router;
