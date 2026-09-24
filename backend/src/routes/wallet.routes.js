const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/balance', walletController.getBalance);
router.post('/add', walletController.addMoney);
router.post('/withdraw', walletController.withdraw);
router.get('/transactions', walletController.getTransactions);

module.exports = router;
