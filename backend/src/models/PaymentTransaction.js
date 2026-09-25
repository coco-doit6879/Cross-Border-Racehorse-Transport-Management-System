const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['VNPAY'],
    default: 'VNPAY',
    required: true
  },
  txnRef: { type: String, required: true, unique: true, index: true },
  amountVnd: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'],
    default: 'PENDING',
    index: true
  },
  responseCode: String,
  transactionNo: String,
  bankCode: String,
  cardType: String,
  payDate: String,
  failureMessage: String,
  callbackPayload: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
