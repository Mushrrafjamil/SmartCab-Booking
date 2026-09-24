const Payment = require('../models/Payment');
const Ride = require('../models/Ride');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { notifyPaymentUpdate } = require('./notificationService');

const METHODS = ['cash', 'upi', 'card', 'wallet', 'netbanking', 'credit_card'];

const createPaymentFromRide = async (ride, status = 'pending') => {
  const existing = await Payment.findOne({ rideId: ride._id });
  if (existing) return existing;

  return Payment.create({
    rideId: ride._id,
    userId: ride.passengerId,
    driverId: ride.driverId,
    amount: ride.fareDetails.finalFare,
    taxAmount: ride.fareDetails.gst || 0,
    discountAmount: ride.fareDetails.couponDiscount || 0,
    couponCode: ride.couponCode || '',
    method: ride.paymentMethod,
    status,
    fareBreakdown: ride.fareDetails,
    invoiceNumber: ride.invoiceNumber || '',
    paidAt: status === 'paid' ? new Date() : undefined,
    verifiedAt: status === 'paid' ? new Date() : undefined,
  });
};

const processWalletPayment = async (user, amount) => {
  if (user.walletBalance < amount) {
    return { success: false, message: 'Insufficient wallet balance' };
  }
  user.walletBalance -= amount;
  await user.save();
  await Transaction.create({
    userId: user._id,
    amount,
    type: 'debit',
    description: 'Ride payment',
    status: 'success',
  });
  return { success: true };
};

const processPayment = async (rideId, userId, { method, transactionRef } = {}) => {
  const ride = await Ride.findById(rideId);
  if (!ride) return { success: false, message: 'Ride not found', statusCode: 404 };
  if (ride.passengerId.toString() !== userId.toString()) {
    return { success: false, message: 'Not authorized', statusCode: 403 };
  }
  if (ride.status !== 'completed') {
    return { success: false, message: 'Payment only for completed rides', statusCode: 400 };
  }

  const payMethod = method || ride.paymentMethod;
  if (!METHODS.includes(payMethod)) {
    return { success: false, message: 'Invalid payment method', statusCode: 400 };
  }

  let payment = await Payment.findOne({ rideId: ride._id });
  if (!payment) payment = await createPaymentFromRide(ride, 'pending');

  if (payment.status === 'paid') {
    return { success: true, message: 'Already paid', payment };
  }

  if (payMethod === 'wallet') {
    const user = await User.findById(userId);
    const result = await processWalletPayment(user, ride.fareDetails.finalFare);
    if (!result.success) {
      payment.status = 'failed';
      payment.failureReason = result.message;
      await payment.save();
      await notifyPaymentUpdate(userId, 'Payment Failed', result.message, { rideId, paymentId: payment._id });
      return { success: false, message: result.message, statusCode: 400, payment };
    }
  }

  payment.method = payMethod;
  payment.status = 'paid';
  payment.paidAt = new Date();
  payment.verifiedAt = new Date();
  if (transactionRef) payment.transactionId = transactionRef;
  if (!payment.invoiceNumber) payment.invoiceNumber = ride.invoiceNumber || `INV${Date.now()}`;
  await payment.save();

  ride.paymentMethod = payMethod;
  ride.paymentStatus = 'paid';
  if (!ride.invoiceNumber) ride.invoiceNumber = payment.invoiceNumber;
  await ride.save();

  await notifyPaymentUpdate(userId, 'Payment Successful', `₹${payment.amount} paid via ${payMethod}`, {
    rideId, paymentId: payment._id, amount: payment.amount,
  });

  return { success: true, message: 'Payment successful', payment };
};

module.exports = {
  createPaymentFromRide,
  processPayment,
  METHODS,
};
