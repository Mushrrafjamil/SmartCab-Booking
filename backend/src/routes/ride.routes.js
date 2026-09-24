const express = require('express');
const router = express.Router();
const rideController = require('../controllers/ride.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.post('/estimate', protect, rideController.estimateFare);
router.post('/book', protect, authorize('user'), rideController.bookRide);
router.get('/', protect, authorize('admin'), rideController.getAllRides);
router.get('/:id', protect, rideController.getRide);
router.get('/:id/track', protect, rideController.trackRide);
router.put('/:id/status', protect, rideController.updateRideStatus);
router.put('/:id/cancel', protect, rideController.cancelRide);
router.put('/:id/assign', protect, authorize('admin'), rideController.assignDriver);
router.put('/:id/driver-location', protect, authorize('driver'), rideController.updateDriverLocation);

module.exports = router;
