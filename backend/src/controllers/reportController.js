const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');

const dateRange = (from, to) => {
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(to);
  return Object.keys(range).length ? range : null;
};

const toCsv = (headers, rows) => {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
};

const sendExport = (res, filename, csv) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
};

exports.getUserReport = async (req, res, next) => {
  try {
    const range = dateRange(req.query.from, req.query.to);
    const userQuery = { role: 'passenger', isDeleted: false };
    if (range) userQuery.createdAt = range;

    const [totalUsers, activeUsers, newRegistrations, verifiedUsers, blockedUsers] = await Promise.all([
      User.countDocuments({ role: 'passenger', isDeleted: false }),
      User.countDocuments({ role: 'passenger', isDeleted: false, isActive: true, isSuspended: false }),
      User.countDocuments(userQuery),
      User.countDocuments({ role: 'passenger', isEmailVerified: true, isPhoneVerified: true, isDeleted: false }),
      User.countDocuments({ role: 'passenger', $or: [{ isSuspended: true }, { isActive: false }] }),
    ]);

    const report = {
      totalUsers, activeUsers, newRegistrations, verifiedUsers, blockedUsers,
      userGrowth: newRegistrations,
    };

    if (req.query.export === 'csv') {
      const csv = toCsv(['Metric', 'Value'], Object.entries(report));
      return sendExport(res, 'user-report.csv', csv);
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.getDriverReport = async (req, res, next) => {
  try {
    const [totalDrivers, activeDrivers, onlineDrivers, offlineDrivers, verifiedDrivers, pendingVerification] = await Promise.all([
      Driver.countDocuments(),
      Driver.countDocuments({ verificationStatus: 'approved' }),
      Driver.countDocuments({ status: 'online' }),
      Driver.countDocuments({ status: 'offline' }),
      Driver.countDocuments({ verificationStatus: 'approved' }),
      Driver.countDocuments({ verificationStatus: { $in: ['pending', 'under_review'] } }),
    ]);

    const topDrivers = await Driver.find({ verificationStatus: 'approved' })
      .populate('userId', 'name')
      .sort({ rating: -1 })
      .limit(10)
      .select('rating ratingCount status');

    const completedRides = await Ride.find({ status: 'completed' }).select('driverId fareDetails');
    const earningsMap = {};
    completedRides.forEach((r) => {
      const id = r.driverId?.toString();
      if (!id) return;
      earningsMap[id] = (earningsMap[id] || 0) + (r.fareDetails?.finalFare || 0) * 0.85;
    });

    const report = {
      totalDrivers, activeDrivers, onlineDrivers, offlineDrivers,
      verifiedDrivers, pendingVerification,
      driverPerformance: topDrivers.map((d) => ({
        name: d.userId?.name,
        rating: d.rating,
        rides: d.ratingCount,
        status: d.status,
        earnings: Math.round(earningsMap[d._id.toString()] || 0),
      })),
    };

    if (req.query.export === 'csv') {
      const rows = report.driverPerformance.map((d) => [d.name, d.rating, d.rides, d.earnings, d.status]);
      const csv = toCsv(['Name', 'Rating', 'Rides', 'Earnings', 'Status'], rows);
      return sendExport(res, 'driver-report.csv', csv);
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.getRideReport = async (req, res, next) => {
  try {
    const range = dateRange(req.query.from, req.query.to);
    const query = range ? { createdAt: range } : {};

    const [totalRides, completedRides, cancelledRides, ongoingRides, scheduledRides] = await Promise.all([
      Ride.countDocuments(query),
      Ride.countDocuments({ ...query, status: 'completed' }),
      Ride.countDocuments({ ...query, status: 'cancelled' }),
      Ride.countDocuments({ status: { $in: ['searching', 'assigned', 'arrived', 'started'] } }),
      Ride.countDocuments({ ...query, isScheduled: true }),
    ]);

    const rides = await Ride.find({ ...query, status: 'completed' }).select('distance duration createdAt');
    const totalDistance = rides.reduce((s, r) => s + (r.distance || 0), 0);
    const totalDuration = rides.reduce((s, r) => s + (r.duration || 0), 0);

    const report = {
      totalRides, completedRides, cancelledRides, ongoingRides, scheduledRides,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration,
      avgDistance: completedRides ? Math.round((totalDistance / completedRides) * 100) / 100 : 0,
      avgDuration: completedRides ? Math.round(totalDuration / completedRides) : 0,
    };

    if (req.query.export === 'csv') {
      const csv = toCsv(['Metric', 'Value'], Object.entries(report));
      return sendExport(res, 'ride-report.csv', csv);
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.getRevenueReport = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const completed = await Ride.find({ status: 'completed' }).select('fareDetails updatedAt');

    const sumSince = (date) => completed
      .filter((r) => new Date(r.updatedAt) >= date)
      .reduce((s, r) => s + (r.fareDetails?.finalFare || 0), 0);

    const totalRevenue = completed.reduce((s, r) => s + (r.fareDetails?.finalFare || 0), 0);
    const totalTax = completed.reduce((s, r) => s + (r.fareDetails?.gst || 0), 0);
    const totalDiscount = completed.reduce((s, r) => s + (r.fareDetails?.couponDiscount || 0), 0);
    const driverEarnings = Math.round(totalRevenue * 0.85);
    const companyEarnings = Math.round(totalRevenue * 0.15);

    const report = {
      dailyRevenue: Math.round(sumSince(startOfDay)),
      weeklyRevenue: Math.round(sumSince(startOfWeek)),
      monthlyRevenue: Math.round(sumSince(startOfMonth)),
      yearlyRevenue: Math.round(sumSince(startOfYear)),
      totalRevenue: Math.round(totalRevenue),
      driverEarnings,
      companyEarnings,
      taxesCollected: Math.round(totalTax),
      discountsApplied: Math.round(totalDiscount),
    };

    if (req.query.export === 'csv') {
      const csv = toCsv(['Metric', 'Value'], Object.entries(report));
      return sendExport(res, 'revenue-report.csv', csv);
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentReport = async (req, res, next) => {
  try {
    const [totalPayments, pending, successful, failed, refunded] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'paid' }),
      Payment.countDocuments({ status: 'failed' }),
      Payment.countDocuments({ status: { $in: ['refunded', 'refund_pending'] } }),
    ]);

    const byMethod = await Payment.aggregate([
      { $group: { _id: '$method', count: { $sum: 1 }, total: { $sum: '$amount' } } },
    ]);

    const recent = await Payment.find()
      .populate('userId', 'name')
      .populate('rideId', 'rideId')
      .sort({ createdAt: -1 })
      .limit(20);

    const report = {
      totalPayments, pendingPayments: pending, successfulPayments: successful,
      failedPayments: failed, refundedPayments: refunded,
      paymentMethods: byMethod,
      recentTransactions: recent,
    };

    if (req.query.export === 'csv') {
      const rows = byMethod.map((m) => [m._id, m.count, m.total]);
      const csv = toCsv(['Method', 'Count', 'Total'], rows);
      return sendExport(res, 'payment-report.csv', csv);
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.getVehicleReport = async (req, res, next) => {
  try {
    const Vehicle = require('../models/Vehicle');
    const [total, approved, pending, rejected, available, busy] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ verificationStatus: 'approved' }),
      Vehicle.countDocuments({ verificationStatus: 'pending' }),
      Vehicle.countDocuments({ verificationStatus: 'rejected' }),
      Vehicle.countDocuments({ status: 'available' }),
      Vehicle.countDocuments({ status: 'busy' }),
    ]);

    const byType = await Vehicle.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const report = { totalVehicles: total, approved, pending, rejected, available, busy, byType };

    if (req.query.export === 'csv') {
      const rows = byType.map((t) => [t._id, t.count]);
      return sendExport(res, 'vehicle-report.csv', toCsv(['Type', 'Count'], rows));
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.getCouponReport = async (req, res, next) => {
  try {
    const Coupon = require('../models/Coupon');
    const [total, active, expired] = await Promise.all([
      Coupon.countDocuments(),
      Coupon.countDocuments({ isActive: true, expiryDate: { $gt: new Date() } }),
      Coupon.countDocuments({ expiryDate: { $lt: new Date() } }),
    ]);

    const coupons = await Coupon.find().sort({ createdAt: -1 }).limit(20);
    const report = { totalCoupons: total, activeCoupons: active, expiredCoupons: expired, recentCoupons: coupons };

    if (req.query.export === 'csv') {
      const rows = coupons.map((c) => [c.code, c.discountPercentage, c.isActive, c.expiryDate]);
      return sendExport(res, 'coupon-report.csv', toCsv(['Code', 'Discount%', 'Active', 'Expiry'], rows));
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.getRefundReport = async (req, res, next) => {
  try {
    const [requested, completed, rejected, totalAmount] = await Promise.all([
      Payment.countDocuments({ refundStatus: 'requested' }),
      Payment.countDocuments({ refundStatus: 'completed' }),
      Payment.countDocuments({ refundStatus: 'rejected' }),
      Payment.aggregate([
        { $match: { status: 'refunded' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const recent = await Payment.find({ refundStatus: { $ne: 'none' } })
      .populate('userId', 'name')
      .sort({ updatedAt: -1 })
      .limit(20);

    const report = {
      refundRequested: requested,
      refundCompleted: completed,
      refundRejected: rejected,
      totalRefunded: totalAmount[0]?.total || 0,
      recentRefunds: recent,
    };

    if (req.query.export === 'csv') {
      const rows = recent.map((p) => [p.paymentId, p.amount, p.refundStatus, p.refundReason]);
      return sendExport(res, 'refund-report.csv', toCsv(['PaymentId', 'Amount', 'Status', 'Reason'], rows));
    }

    res.json({ success: true, report });
  } catch (error) {
    next(error);
  }
};
