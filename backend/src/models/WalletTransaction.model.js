const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['credit', 'debit', 'cashback', 'referral_bonus', 'withdrawal'],
      required: true,
    },
    amount: { type: Number, required: true },
    balance: Number,
    description: String,
    referenceId: String,
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
