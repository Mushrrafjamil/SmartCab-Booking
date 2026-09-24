const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.use(protect);

router.get('/admin/all', authorize('admin', 'super_admin'), paymentController.getAllPaymentsAdmin);
router.put('/admin/:id/refund', authorize('admin', 'super_admin'), paymentController.processRefundAdmin);

router.post('/gateway/razorpay/order', paymentController.createRazorpayOrder);
router.post('/gateway/razorpay/verify', paymentController.verifyRazorpayPayment);
router.post('/gateway/stripe/intent', paymentController.createStripeIntent);

router.get('/invoices', paymentController.getInvoiceHistory);
router.get('/invoices/:rideId', paymentController.getInvoice);
router.post('/invoices/:rideId/email', paymentController.emailInvoice);

router.get('/', paymentController.getPayments);
router.post('/process/:rideId', paymentController.processPaymentForRide);
router.get('/:id/verify', paymentController.verifyPayment);
router.post('/:id/retry', paymentController.retryPayment);
router.post('/:id/refund', paymentController.requestRefund);
router.get('/:id', paymentController.getPayment);

module.exports = router;
