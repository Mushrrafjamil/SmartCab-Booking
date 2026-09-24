const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  getDashboard,
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  removeProfilePhoto,
  requestPhoneUpdateOtp,
  updatePhone,
  requestEmailUpdateOtp,
  updateEmail,
  changePassword,
  addWalletFunds,
  getWalletTransactions,
  getSavedLocations,
  saveLocation,
  deleteSavedLocation,
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  setPrimaryEmergencyContact,
  deleteEmergencyContact,
} = require('../controllers/userController');

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/photo', upload.single('profilePhoto'), uploadProfilePhoto);
router.delete('/profile/photo', removeProfilePhoto);

router.post('/profile/phone/request-otp', requestPhoneUpdateOtp);
router.put('/profile/phone', updatePhone);
router.post('/profile/email/request-otp', requestEmailUpdateOtp);
router.put('/profile/email', updateEmail);
router.put('/change-password', changePassword);

router.post('/wallet', addWalletFunds);
router.get('/wallet/transactions', getWalletTransactions);

router.get('/locations', getSavedLocations);
router.post('/locations', saveLocation);
router.delete('/locations/:id', deleteSavedLocation);

router.get('/emergency', getEmergencyContacts);
router.post('/emergency', addEmergencyContact);
router.put('/emergency/:id', updateEmergencyContact);
router.put('/emergency/:id/primary', setPrimaryEmergencyContact);
router.delete('/emergency/:id', deleteEmergencyContact);

module.exports = router;
