const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Nullable for unauthenticated failed attempts (e.g. non-existent user login)
    index: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    index: true
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    trim: true
  },
  resourceId: {
    type: String,
    required: [true, 'Resource ID is required'],
    trim: true
  },
  result: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'DENIED'],
    default: 'SUCCESS',
    required: [true, 'Result status is required'],
    index: true
  },
  errorMessage: {
    type: String
  },
  ipAddress: {
    type: String,
    default: '0.0.0.0'
  },
  userAgent: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
