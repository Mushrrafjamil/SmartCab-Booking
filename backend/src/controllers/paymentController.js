const Payment = require('../models/Payment');
const Ride = require('../models/Ride');
const User = require('../models/User');
const { processPayment, createPaymentFromRide } = require('../services/paymentService');
const { notifyPaymentUpdate, sendEmail } = require('../services/notificationService');

const getUserId = (req) => req.user._id || req.user.id;

const buildInvoice = (ride, payment) => ({
  invoiceNumber: payment?.invoiceNumber || ride.invoiceNumber || `INV${ride._id}`,
  rideId: ride.rideId,
  date: payment?.paidAt || ride.updatedAt,
  passenger: ride.passengerId,
  driver: ride.driverId?.userId,
  vehicle: ride.vehicleId,
  pickup: ride.pickup,
  destination: ride.destination,
  distance: ride.distance,
  duration: ride.duration,
  fareBreakdown: ride.fareDetails,
  paymentMethod: payment?.method || ride.paymentMethod,
  paymentStatus: payment?.status || ride.paymentStatus,
  gst: ride.fareDetails?.gst,
  discount: ride.fareDetails?.couponDiscount || 0,
  couponCode: ride.couponCode || payment?.couponCode || '',
  total: ride.fareDetails?.finalFare,
  paymentId: payment?.paymentId,
  transactionId: payment?.transactionId,
});

const invoiceHtml = (invoice, ride) => `<!DOCTYPE html><html><head><title>Invoice ${invoice.invoiceNumber}</title>
<style>body{font-family:sans-serif;padding:40px;max-width:800px;margin:auto}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #eee;text-align:left}.total{font-weight:bold;font-size:1.2em}</style></head><body>
<h1>CabBook Invoice</h1>
<p><strong>Invoice:</strong> ${invoice.invoiceNumber}</p>
<p><strong>Payment ID:</strong> ${invoice.paymentId || '—'}</p>
<p><strong>Transaction ID:</strong> ${invoice.transactionId || '—'}</p>
<p><strong>Ride:</strong> ${invoice.rideId}</p>
<p><strong>Date:</strong> ${new Date(invoice.date).toLocaleString()}</p>
<hr/>
<p><strong>Passenger:</strong> ${invoice.passenger?.name || '—'} · ${invoice.passenger?.phone || ''}</p>
<p><strong>Driver:</strong> ${invoice.driver?.name || '—'}</p>
<p><strong>From:</strong> ${ride.pickup.address}</p>
<p><strong>To:</strong> ${ride.destination.address}</p>
<p>Distance: ${ride.distance} km · Duration: ${ride.duration} min</p>
<hr/>
<table>
<tr><td>Base Fare</td><td>₹${ride.fareDetails.baseFare}</td></tr>
<tr><td>Distance Charge</td><td>₹${ride.fareDetails.distanceCharge}</td></tr>
<tr><td>Time Charge</td><td>₹${ride.fareDetails.timeCharge}</td></tr>
<tr><td>GST</td><td>₹${ride.fareDetails.gst}</td></tr>
<tr><td>Discount${invoice.couponCode ? ` (${invoice.couponCode})` : ''}</td><td>-₹${invoice.discount}</td></tr>
<tr class="total"><td>Total</td><td>₹${ride.fareDetails.finalFare}</td></tr>
</table>
<p>Payment: ${invoice.paymentMethod} · ${invoice.paymentStatus}</p>
</body></html>`;

exports.getPayments = async (req, res, next) => {
  try {
    const { status, method, from, to, page = 1, limit = 20 } = req.query;
    const query = { userId: getUserId(req) };
    if (status) query.status = status;
    if (method) query.method = method;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(query).populate('rideId', 'rideId pickup destination status').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    res.json({ success: true, payments, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (error) {
    next(error);
  }
};

exports.getPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('rideId')
      .populate('userId', 'name email phone');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.userId._id.toString() !== getUserId(req).toString() && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({ success: true, payment });
  } catch (error) {
    next(error);
  }
};

exports.processPaymentForRide = async (req, res, next) => {
  try {
    const result = await processPayment(req.params.rideId, getUserId(req), req.body);
    if (!result.success) return res.status(result.statusCode || 400).json(result);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.retryPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.userId.toString() !== getUserId(req).toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (payment.status !== 'failed') {
      return res.status(400).json({ success: false, message: 'Only failed payments can be retried' });
    }
    payment.status = 'pending';
    payment.failureReason = '';
    await payment.save();

    const result = await processPayment(payment.rideId, getUserId(req), { method: req.body.method || payment.method });
    if (!result.success) return res.status(result.statusCode || 400).json(result);
    res.json({ success: true, message: 'Payment retried successfully', payment: result.payment });
  } catch (error) {
    next(error);
  }
};

exports.requestRefund = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.userId.toString() !== getUserId(req).toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (payment.status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Only paid payments can be refunded' });
    }

    payment.refundStatus = 'requested';
    payment.refundReason = reason || 'User requested refund';
    payment.status = 'refund_pending';
    await payment.save();

    const ride = await Ride.findById(payment.rideId);
    if (ride) { ride.paymentStatus = 'refunded'; await ride.save(); }

    await notifyPaymentUpdate(getUserId(req), 'Refund Requested', 'Your refund request is being processed.', { paymentId: payment._id });

    res.json({ success: true, message: 'Refund request submitted', payment });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.userId.toString() !== getUserId(req).toString() && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.json({
      success: true,
      verified: payment.status === 'paid',
      payment: {
        paymentId: payment.paymentId,
        transactionId: payment.transactionId,
        status: payment.status,
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
        verifiedAt: payment.verifiedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getInvoiceHistory = async (req, res, next) => {
  try {
    const payments = await Payment.find({ userId: getUserId(req), status: { $in: ['paid', 'refunded'] } })
      .populate('rideId', 'rideId pickup destination')
      .sort({ createdAt: -1 });
    res.json({ success: true, invoices: payments });
  } catch (error) {
    next(error);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId)
      .populate('passengerId', 'name email phone')
      .populate({ path: 'driverId', populate: { path: 'userId', select: 'name phone' } })
      .populate('vehicleId');

    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    const isOwner = ride.passengerId._id.toString() === getUserId(req).toString();
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    if (!isOwner && !isAdmin) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (ride.status !== 'completed') return res.status(400).json({ success: false, message: 'Invoice available for completed rides only' });

    let payment = await Payment.findOne({ rideId: ride._id });
    if (!payment) payment = await createPaymentFromRide(ride, ride.paymentStatus === 'paid' ? 'paid' : 'pending');

    const invoice = buildInvoice(ride, payment);

    if (req.query.format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(invoiceHtml(invoice, ride));
    }

    res.json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
};

exports.emailInvoice = async (req, res, next) => {
  try {
    const ride = await Ride.findById(req.params.rideId).populate('passengerId', 'name email');
    if (!ride) return res.status(404).json({ success: false, message: 'Ride not found' });
    if (ride.passengerId._id.toString() !== getUserId(req).toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const payment = await Payment.findOne({ rideId: ride._id });
    const invoice = buildInvoice(ride, payment);
    const html = invoiceHtml(invoice, ride);
    const email = req.body.email || ride.passengerId.email;
    const result = await sendEmail(email, `CabBook Invoice ${invoice.invoiceNumber}`, html);

    res.json({ success: true, message: result.sent ? 'Invoice emailed successfully' : 'Email queued (SMTP not configured)', result });
  } catch (error) {
    next(error);
  }
};

exports.getAllPaymentsAdmin = async (req, res, next) => {
  try {
    const { status, method, from, to, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (method) query.method = method;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('userId', 'name email phone')
        .populate('rideId', 'rideId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(query),
    ]);

    const summary = await Payment.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]);

    res.json({ success: true, payments, summary, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (error) {
    next(error);
  }
};

exports.processRefundAdmin = async (req, res, next) => {
  try {
    const { action } = req.body;
    const payment = await Payment.findById(req.params.id).populate('userId');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    if (action === 'approve') {
      payment.status = 'refunded';
      payment.refundStatus = 'completed';
      payment.refundedAt = new Date();
      if (payment.method === 'wallet' && payment.userId) {
        payment.userId.walletBalance += payment.amount;
        await payment.userId.save();
      }
      await payment.save();
      await notifyPaymentUpdate(payment.userId._id, 'Refund Completed', `₹${payment.amount} refunded to your account.`);
      return res.json({ success: true, message: 'Refund approved', payment });
    }

    if (action === 'reject') {
      payment.status = 'paid';
      payment.refundStatus = 'rejected';
      await payment.save();
      return res.json({ success: true, message: 'Refund rejected', payment });
    }

    return res.status(400).json({ success: false, message: 'Invalid action. Use approve or reject' });
  } catch (error) {
    next(error);
  }
};

exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { amount, rideId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_stub';

    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      try {
        const Razorpay = require('razorpay');
        const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
        const order = await rzp.orders.create({
          amount: Math.round(amount * 100),
          currency: 'INR',
          receipt: rideId || orderId,
        });
        return res.json({ success: true, provider: 'razorpay', order, keyId });
      } catch (err) {
        console.error('Razorpay error:', err.message);
      }
    }

    res.json({
      success: true,
      provider: 'razorpay',
      stub: true,
      keyId,
      order: { id: orderId, amount: Math.round(amount * 100), currency: 'INR', receipt: rideId },
      message: 'Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for live payments',
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { rideId, razorpay_order_id, razorpay_payment_id } = req.body;
    if (!rideId) return res.status(400).json({ success: false, message: 'rideId required' });

    const result = await processPayment(rideId, getUserId(req), {
      method: 'upi',
      transactionRef: razorpay_payment_id || razorpay_order_id,
    });
    if (!result.success) return res.status(result.statusCode || 400).json(result);
    res.json({ success: true, message: 'Payment verified', payment: result.payment });
  } catch (error) {
    next(error);
  }
};

exports.createStripeIntent = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const intent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: 'inr',
        });
        return res.json({ success: true, provider: 'stripe', clientSecret: intent.client_secret });
      } catch (err) {
        console.error('Stripe error:', err.message);
      }
    }

    res.json({
      success: true,
      provider: 'stripe',
      stub: true,
      clientSecret: `pi_stub_${Date.now()}_secret`,
      message: 'Configure STRIPE_SECRET_KEY for live payments',
    });
  } catch (error) {
    next(error);
  }
};
