const Notification = require('../models/Notification');
const User = require('../models/User');

const getUserId = (req) => req.user._id || req.user.id;

const formatNotification = (n) => ({
  _id: n._id,
  title: n.title,
  message: n.message,
  type: n.type,
  channel: n.channel,
  metadata: n.metadata,
  isRead: n.read,
  readAt: n.readAt,
  createdAt: n.createdAt,
});

exports.getNotifications = async (req, res, next) => {
  try {
    const { type, read, page = 1, limit = 30 } = req.query;
    const query = { userId: getUserId(req) };
    if (type) query.type = type;
    if (read !== undefined) query.read = read === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId: getUserId(req), read: false }),
    ]);

    res.json({
      success: true,
      notifications: notifications.map(formatNotification),
      unreadCount,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ userId: getUserId(req), read: false });
    res.json({ success: true, unreadCount: count });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: getUserId(req) },
      { read: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification: formatNotification(notification) });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: getUserId(req), read: false },
      { read: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const result = await Notification.findOneAndDelete({ _id: req.params.id, userId: getUserId(req) });
    if (!result) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getPreferences = async (req, res, next) => {
  try {
    const user = await User.findById(getUserId(req)).select('notificationPreferences');
    res.json({
      success: true,
      preferences: user?.notificationPreferences || {
        email: true, sms: true, push: true, promotional: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const user = await User.findById(getUserId(req));
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.notificationPreferences = {
      ...user.notificationPreferences?.toObject?.() || user.notificationPreferences || {},
      ...req.body,
    };
    await user.save();
    res.json({ success: true, preferences: user.notificationPreferences });
  } catch (error) {
    next(error);
  }
};

exports.sendPromotional = async (req, res, next) => {
  try {
    const { title, message, target = 'all' } = req.body;
    if (!title || !message) return res.status(400).json({ success: false, message: 'Title and message required' });

    const query = target === 'drivers' ? { role: 'driver' } : target === 'passengers' ? { role: 'passenger' } : {};
    const users = await User.find({ ...query, isDeleted: false, isActive: true }).select('_id');

    const { createNotification } = require('../services/notificationService');
    await Promise.all(users.map((u) => createNotification({
      userId: u._id, title, message, type: 'promotional', channel: 'push', sendPush: true,
    })));

    res.json({ success: true, message: `Promotional notification sent to ${users.length} users` });
  } catch (error) {
    next(error);
  }
};
