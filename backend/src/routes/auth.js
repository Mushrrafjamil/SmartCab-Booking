const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { handleValidation, registerUserRules, loginRules, otpRules } = require('../middleware/validate');
const { authLimiter, otpLimiter, loginLimiter } = require('../middleware/rateLimit');

router.use(authLimiter);

// User registration
router.post('/register', upload.single('profilePhoto'), registerUserRules, handleValidation, authController.registerUser);

// Driver multi-step registration (steps 1-7)
router.post('/register/driver/step/:step', upload.fields([
  { name: 'aadhaarFront', maxCount: 1 }, { name: 'aadhaarBack', maxCount: 1 },
  { name: 'panCardImage', maxCount: 1 }, { name: 'licenseFront', maxCount: 1 },
  { name: 'licenseBack', maxCount: 1 }, { name: 'rcBook', maxCount: 1 },
  { name: 'insuranceCertificate', maxCount: 1 }, { name: 'pollutionCertificate', maxCount: 1 },
  { name: 'fitnessCertificate', maxCount: 1 }, { name: 'vehicleImages', maxCount: 5 },
  { name: 'profilePhoto', maxCount: 1 }, { name: 'selfieVerification', maxCount: 1 },
]), authController.registerDriverStep);

// Login
router.post('/login', loginLimiter, loginRules, handleValidation, authController.login);
router.post('/login/otp', otpLimiter, authController.sendLoginOtp);
router.post('/login/otp/verify', loginLimiter, otpRules, handleValidation, authController.loginWithOtp);

// OTP verification
router.post('/verify-otp', otpRules, handleValidation, authController.verifyOtp);
router.post('/resend-otp', otpLimiter, authController.resendOtp);

// Password reset
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Token management
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.getMe);

// Session management (protected)
router.get('/sessions', protect, authController.getSessions);
router.delete('/sessions/:id', protect, authController.revokeSession);
router.get('/login-history', protect, authController.getLoginHistory);

module.exports = router;
