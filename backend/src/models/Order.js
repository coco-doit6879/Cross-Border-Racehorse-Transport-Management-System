// Mongoose Order Schema Skeleton
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, unique: true }, // TR-YYYY-XXXX
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  origin: { type: String },
  destination: { type: String },
  horses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Horse' }],
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DOCS_PROCESSING', 'CLEARED_FOR_TRANSPORT', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING', 'COMPLETED'],
    default: 'PENDING_APPROVAL'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
