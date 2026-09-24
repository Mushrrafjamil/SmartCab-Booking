const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  addVehicle,
  getVehicle,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehicleController');

// All vehicle routes require a logged-in driver
router.use(protect);
router.use(authorize('driver'));

router.post('/', addVehicle);
router.get('/', getVehicle);
router.put('/', updateVehicle);
router.delete('/', deleteVehicle);

module.exports = router;
