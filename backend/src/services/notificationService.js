const Notification = require('../models/Notification');
const User = require('../models/User');

const emitToUser = (userId, event, data) => {
  try {
    const io = require('../socket').getIO();
    io.to(`user:${userId}`).emit(event, data);
  } catch { /* socket optional */ }
};

const sendEmail = async (to, subject, html) => {
  if (!process.env.SMTP_HOST || !to) {
    if (process.env.NODE_ENV === 'development') console.log(`[Email stub] To: ${to} | ${subject}`);
    return { sent: false, stub: true };
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({ from: process.env.SMTP_FROM || 'noreply@cabbook.com', to, subject, html });
    return { sent: true };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { sent: false, error: err.message };
  }
};

const sendSms = async (phone, message) => {
  if (process.env.NODE_ENV === 'development') console.log(`[SMS stub] ${phone}: ${message}`);
  return { sent: false, stub: true };
};

const createNotification = async ({
  userId, title, message, type = 'system', channel = 'in_app', metadata = {},
  sendPush = true, sendEmailFlag = false, sendSmsFlag = false,
}) => {
  const notification = await Notification.create({
    userId, title, message, type, channel, metadata, read: false,
  });

  if (sendPush) {
    emitToUser(userId.toString(), 'notification:new', {
      id: notification._id,
      title,
      message,
      type,
      createdAt: notification.createdAt,
    });
  }

  if (sendEmailFlag) {
    const user = await User.findById(userId).select('email name');
    if (user?.email) {
      await sendEmail(user.email, title, `<p>Hi ${user.name},</p><p>${message}</p>`);
    }
  }

  if (sendSmsFlag) {
    const user = await User.findById(userId).select('phone');
    if (user?.phone) await sendSms(user.phone, message);
  }

  return notification;
};

const notifyRideUpdate = (userId, title, message, metadata = {}) =>
  createNotification({ userId, title, message, type: 'ride', channel: 'push', metadata, sendPush: true });

const notifyPaymentUpdate = (userId, title, message, metadata = {}) =>
  createNotification({
    userId, title, message, type: 'payment', channel: 'push', metadata,
    sendPush: true, sendEmailFlag: true,
  });

const notifyPromotional = (userId, title, message) =>
  createNotification({ userId, title, message, type: 'promotional', channel: 'push', sendPush: true });

module.exports = {
  createNotification,
  notifyRideUpdate,
  notifyPaymentUpdate,
  notifyPromotional,
  sendEmail,
  sendSms,
  emitToUser,
};
