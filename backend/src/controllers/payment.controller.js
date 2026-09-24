const Payment = require('../models/Payment.model');
const Ride = require('../models/Ride.model');
const User = require('../models/User.model');

const processPayment = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.rideId);
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    const payment = await Payment.create({
      ride: ride._id,
      user: req.user._id,
      amount: ride.fare.total,
      method: req.body.method || ride.paymentMethod,
      fareBreakdown: ride.fare,
      transactionId: req.body.transactionId || `TXN${Date.now()}`,
      status: 'paid',
      paidAt: new Date(),
    });
    ride.payment = payment._id;
    ride.paymentStatus = 'paid';
    await ride.save();
    if (req.body.method === 'wallet') {
      const user = await User.findById(req.user._id);
      if (user.walletBalance < ride.fare.total) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
      }
      user.walletBalance -= ride.fare.total;
      await user.save();
    }
    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('ride user');
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getTransactions = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    const payments = await Payment.find(filter).populate('ride').sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(
      req.params.id,
      { status: 'refunded', refundAmount: req.body.amount, refundReason: req.body.reason },
      { new: true }
    );
    await Ride.findByIdAndUpdate(payment.ride, { paymentStatus: 'refunded' });
    res.json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { processPayment, getPayment, getTransactions, refundPayment };
