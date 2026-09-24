const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect, authorize('user', 'admin'));

router.get('/dashboard', userController.getDashboard);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);
router.post('/saved-locations', userController.addSavedLocation);
router.get('/ride-history', userController.getRideHistory);

module.exports = router;
