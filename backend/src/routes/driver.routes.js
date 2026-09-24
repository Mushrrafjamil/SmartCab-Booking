const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('driver'));

router.get('/dashboard', driverController.getDashboard);
router.put('/online-status', driverController.toggleOnlineStatus);
router.put('/location', driverController.updateLocation);
router.get('/ride-requests', driverController.getRideRequests);
router.put('/rides/:id/accept', driverController.acceptRide);
router.put('/rides/:id/reject', driverController.rejectRide);
router.get('/earnings', driverController.getEarnings);
router.get('/profile', driverController.getProfile);
router.put('/profile', driverController.updateProfile);

module.exports = router;
