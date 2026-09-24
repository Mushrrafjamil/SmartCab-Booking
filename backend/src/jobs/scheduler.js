const Session = require('../models/Session');
const OtpVerification = require('../models/OtpVerification');

const runCleanup = async () => {
  try {
    const now = new Date();
    const sessionResult = await Session.updateMany(
      { isActive: true, lastActivity: { $lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      { isActive: false, logoutAt: now }
    );
    const otpResult = await OtpVerification.deleteMany({
      expiresAt: { $lt: now },
    });
    if (sessionResult.modifiedCount || otpResult.deletedCount) {
      console.log(`[Scheduler] Cleaned ${sessionResult.modifiedCount} sessions, ${otpResult.deletedCount} expired OTPs`);
    }
  } catch (err) {
    console.error('[Scheduler] Cleanup error:', err.message);
  }
};

const startScheduler = () => {
  runCleanup();
  setInterval(runCleanup, 60 * 60 * 1000);
  console.log('[Scheduler] Background jobs started (session cleanup, OTP expiry)');
};

module.exports = { startScheduler, runCleanup };
