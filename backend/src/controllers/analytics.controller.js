const Ride = require('../models/Ride.model');
const Payment = require('../models/Payment.model');
const User = require('../models/User.model');

const getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [dailyRevenue, monthlyRevenue, totalRides, completedRides, cancelledRides] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'paid', paidAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Ride.countDocuments({ createdAt: { $gte: monthStart } }),
      Ride.countDocuments({ status: 'ride_completed', createdAt: { $gte: monthStart } }),
      Ride.countDocuments({ status: 'cancelled', createdAt: { $gte: monthStart } }),
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
        dailyRevenue: dailyRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        totalRides,
        completedRides,
        cancelledRides,
        cancellationRate: totalRides ? ((cancelledRides / totalRides) * 100).toFixed(2) : 0,
        peakHours,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getDashboard };
