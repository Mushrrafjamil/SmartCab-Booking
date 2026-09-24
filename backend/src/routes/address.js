const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const addressController = require('../controllers/addressController');

router.use(protect);

router.get('/', addressController.listAddresses);
router.get('/recommendations', addressController.getRecommendations);
router.get('/search', addressController.searchAddresses);
router.get('/route', addressController.calculateRoute);
router.get('/gps/history', addressController.getLocationHistory);
router.get('/gps/last-known', addressController.getLastKnownLocation);

router.post('/geocode', addressController.reverseGeocode);
router.post('/gps/detect', addressController.detectGpsLocation);
router.post('/gps/save', addressController.saveGpsLocation);
router.post('/', addressController.createAddress);

router.get('/:id/share', addressController.shareAddress);
router.put('/:id/default', addressController.setDefaultAddress);
router.put('/:id/favorite', addressController.toggleFavorite);
router.put('/:id/use', addressController.recordUsage);
router.put('/:id/verify', addressController.verifyAddress);
router.get('/:id', addressController.getAddress);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);

module.exports = router;
