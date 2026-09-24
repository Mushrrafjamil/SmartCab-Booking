const { body, validationResult } = require('express-validator');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }
  next();
};

const registerUserRules = [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile number required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').optional(),
  body('acceptTerms').custom((v) => v === true || v === 'true').withMessage('You must accept terms and conditions'),
];

const loginRules = [
  body('password').notEmpty().withMessage('Password is required'),
];

const otpRules = [
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
];

module.exports = { handleValidation, registerUserRules, loginRules, otpRules };
