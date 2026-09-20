const mongoose = require('mongoose');

const complianceDocSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true
  },
  horseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Horse'
  },
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    trim: true
  },
  countryCode: {
    type: String,
    required: [true, 'Country code is required'],
    uppercase: true,
    trim: true
  },
  fileUrl: {
    type: String,
    required: false,
    default: null
  },
  expiresAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['PENDING_UPLOAD', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'],
    default: 'PENDING_UPLOAD',
    index: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('ComplianceDoc', complianceDocSchema);
