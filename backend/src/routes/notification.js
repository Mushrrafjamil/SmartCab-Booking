const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  sendPromotional,
} = require('../controllers/notificationController');

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllAsRead);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.post('/promotional', authorize('admin', 'super_admin'), sendPromotional);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
