const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

router.use(protect);
router.use(authorize('admin', 'super_admin'));

router.get('/dashboard', analyticsController.getDashboard);

module.exports = router;
