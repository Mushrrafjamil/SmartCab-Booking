const User = require('../models/User');
const Transaction = require('../models/Transaction');

const getBalance = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, balance: user.walletBalance, walletBalance: user.walletBalance });
  } catch (error) {
    next(error);
  }
};

const addMoney = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid amount' });
    }
    const user = await User.findById(req.user._id || req.user.id);
    user.walletBalance += Number(amount);
    await user.save();

    const transaction = await Transaction.create({
      userId: user._id,
      amount: Number(amount),
      type: 'credit',
      description: 'Wallet top-up',
      status: 'success',
    });

    res.json({ success: true, message: `₹${amount} added to wallet`, balance: user.walletBalance, walletBalance: user.walletBalance, transaction });
  } catch (error) {
    next(error);
  }
};

const withdraw = async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide a valid amount' });
    }
    const user = await User.findById(req.user._id || req.user.id);
    if (user.walletBalance < Number(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }
    user.walletBalance -= Number(amount);
    await user.save();

    const transaction = await Transaction.create({
      userId: user._id,
      amount: Number(amount),
      type: 'debit',
      description: 'Wallet withdrawal',
      status: 'pending',
    });

    res.json({ success: true, message: 'Withdrawal request submitted', balance: user.walletBalance, transaction });
  } catch (error) {
    next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id || req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, transactions });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBalance, addMoney, withdraw, getTransactions };
