const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const assignmentController = require('../controllers/assignmentController');

router.use(protect);

// Driver endpoints
router.get('/driver/pending', authorize('driver'), assignmentController.getPendingForDriver);
router.post('/rides/:rideId/accept', authorize('driver'), assignmentController.driverAccept);
router.post('/rides/:rideId/reject', authorize('driver'), assignmentController.driverReject);

// Admin / dispatcher endpoints
router.get('/rides/:rideId/drivers', authorize('admin', 'super_admin'), assignmentController.searchAvailableDrivers);
router.post('/rides/:rideId/auto', authorize('admin', 'super_admin'), assignmentController.autoAssign);
router.post('/rides/:rideId/manual', authorize('admin', 'super_admin'), assignmentController.manualAssign);
router.post('/rides/:rideId/reassign', authorize('admin', 'super_admin'), assignmentController.reassign);
router.get('/rides/:rideId/history', assignmentController.getAssignmentHistory);
router.get('/history', authorize('admin', 'super_admin'), assignmentController.getAssignmentHistory);

// Availability checks
router.get('/drivers/:driverId/availability', assignmentController.checkDriverAvailability);

module.exports = router;
