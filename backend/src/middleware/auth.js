const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes: Verify token and attach user to request
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey123!');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user found with this id' });
    }
    if (user.isDeleted || user.isSuspended || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is not active' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid authentication token' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    const allowed = new Set(roles);
    if (roles.includes('admin')) allowed.add('super_admin');
    if (!req.user || !allowed.has(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'none'}' is not authorized`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
