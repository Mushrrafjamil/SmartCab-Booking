const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getDriverDashboard,
  getDriverProfile,
  updateStatus,
  updateLocation,
  getDriverEarnings,
  getRideRequests,
  toggleOnlineStatus,
  getDocuments,
  uploadDocument,
  deleteDocument,
} = require('../controllers/driverController');

router.use(protect);
router.use(authorize('driver'));

router.get('/dashboard', getDriverDashboard);
router.get('/profile', getDriverProfile);
router.put('/status', updateStatus);
router.put('/online-status', toggleOnlineStatus);
router.put('/location', updateLocation);
router.get('/earnings', getDriverEarnings);
router.get('/requests', getRideRequests);

router.get('/documents', getDocuments);
router.post('/documents/:docType', upload.single('file'), uploadDocument);
router.delete('/documents/:docType', deleteDocument);

module.exports = router;
