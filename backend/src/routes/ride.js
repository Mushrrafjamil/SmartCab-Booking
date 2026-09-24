const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getEstimate,
  estimateFromRoute,
  bookRide,
  getRide,
  trackRide,
  acceptRide,
  updateRideStatus,
  cancelRide,
  rejectRide,
  updateScheduledRide,
  getActiveRide,
  getRideHistory,
  getInvoice,
  shareRide,
  submitRating,
  getNearbyDrivers,
  updateDriverLocation,
} = require('../controllers/rideController');

router.use(protect);

router.get('/estimate', getEstimate);
router.post('/estimate', estimateFromRoute);
router.get('/nearby-drivers', getNearbyDrivers);
router.post('/book', bookRide);
router.get('/active', getActiveRide);
router.get('/history', getRideHistory);

router.get('/:rideId', getRide);
router.get('/:rideId/track', trackRide);
router.get('/:rideId/invoice', getInvoice);
router.get('/:rideId/share', shareRide);

router.post('/:rideId/accept', authorize('driver'), acceptRide);
router.post('/:rideId/reject', authorize('driver'), rejectRide);
router.put('/:rideId/status', updateRideStatus);
router.post('/:rideId/cancel', cancelRide);
router.put('/:rideId/schedule', updateScheduledRide);
router.put('/:rideId/driver-location', authorize('driver'), updateDriverLocation);
router.post('/:rideId/rate', submitRating);

module.exports = router;
