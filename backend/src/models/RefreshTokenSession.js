const mongoose = require('mongoose');

const refreshTokenSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  refreshTokenHash: {
    type: String,
    required: true,
    index: true
  },
  deviceName: {
    type: String,
    default: 'Unknown Device'
  },
  ipAddress: {
    type: String,
    default: '0.0.0.0'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('RefreshTokenSession', refreshTokenSessionSchema);
