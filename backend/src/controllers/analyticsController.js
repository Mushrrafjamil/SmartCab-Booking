const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Driver = require('../models/Driver');

exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailyPayments, monthlyPayments, totalRides, completedRides, cancelledRides, totalUsers, totalDrivers] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Ride.countDocuments({ createdAt: { $gte: monthStart } }),
      Ride.countDocuments({ status: 'completed', createdAt: { $gte: monthStart } }),
      Ride.countDocuments({ status: 'cancelled', createdAt: { $gte: monthStart } }),
      User.countDocuments({ role: 'passenger', isDeleted: false }),
      Driver.countDocuments(),
    ]);

    const peakHours = await Ride.aggregate([
      { $match: { createdAt: { $gte: monthStart } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    res.json({
      success: true,
      data: {
        dailyRevenue: dailyPayments[0]?.total || 0,
        monthlyRevenue: monthlyPayments[0]?.total || 0,
        totalRides,
        completedRides,
        cancelledRides,
        totalUsers,
        totalDrivers,
        cancellationRate: totalRides ? ((cancelledRides / totalRides) * 100).toFixed(2) : 0,
        peakHours,
      },
    });
  } catch (error) {
    next(error);
  }
};
