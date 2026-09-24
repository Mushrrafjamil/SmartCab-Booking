const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const adminCtrl = require('../controllers/adminController');
const adminAuthCtrl = require('../controllers/adminAuthController');
const assignmentCtrl = require('../controllers/assignmentController');

router.use(protect);
router.use(authorize('admin', 'super_admin'));

router.get('/stats', adminCtrl.getStats);
router.get('/users', adminCtrl.getUsers);
router.get('/users/search', adminAuthCtrl.searchAccounts);
router.put('/users/:userId/suspend', adminAuthCtrl.suspendAccount);
router.post('/users/:userId/force-logout', adminAuthCtrl.forceLogout);
router.delete('/users/:userId', adminAuthCtrl.deleteAccount);
router.put('/users/:userId/restore', adminAuthCtrl.restoreAccount);

router.get('/drivers/pending', adminCtrl.getPendingDrivers);
router.get('/drivers', adminCtrl.getDrivers);
router.post('/drivers', adminCtrl.createDriver);
router.put('/drivers/:driverId/approve', adminCtrl.approveDriverStatus);
router.put('/drivers/:driverId/review', adminAuthCtrl.reviewDriver);

router.get('/vehicles/pending', adminCtrl.getPendingVehicles);
router.put('/vehicles/:vehicleId/approve', adminCtrl.approveVehicleStatus);

router.get('/rides/live', adminCtrl.getLiveRides);
router.get('/assignments/history', assignmentCtrl.getAssignmentHistory);

router.get('/rides/:rideId/assign/drivers', assignmentCtrl.searchAvailableDrivers);
router.post('/rides/:rideId/assign/auto', assignmentCtrl.autoAssign);
router.post('/rides/:rideId/assign/manual', assignmentCtrl.manualAssign);
router.post('/rides/:rideId/assign/reassign', assignmentCtrl.reassign);
router.get('/rides/:rideId/assign/history', assignmentCtrl.getAssignmentHistory);

router.get('/login-history', adminAuthCtrl.getUserLoginHistory);
router.get('/login-history/:userId', adminAuthCtrl.getUserLoginHistory);
router.get('/security-logs', adminAuthCtrl.getSecurityLogs);
router.get('/otp-logs', adminAuthCtrl.getOtpLogs);
router.get('/activity-logs', adminAuthCtrl.getActivityLogs);
router.get('/activity-logs/:userId', adminAuthCtrl.getActivityLogs);

module.exports = router;
