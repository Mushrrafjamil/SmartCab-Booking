const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', authorize('driver', 'admin'), vehicleController.createVehicle);
router.get('/', vehicleController.getVehicles);
router.get('/:id', vehicleController.getVehicle);
router.put('/:id', authorize('driver', 'admin'), vehicleController.updateVehicle);
router.delete('/:id', authorize('admin'), vehicleController.deleteVehicle);
router.put('/:id/verify', authorize('admin'), vehicleController.verifyVehicle);

module.exports = router;
