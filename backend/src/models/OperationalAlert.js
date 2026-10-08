const mongoose = require('mongoose');
module.exports = mongoose.model('OperationalAlert', new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  kind: { type: String, enum: ['GPS_STALE', 'SOS_UNACKNOWLEDGED'], required: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute' },
  message: String,
  active: { type: Boolean, default: true },
  firstDetectedAt: { type: Date, default: Date.now },
  lastDetectedAt: Date,
  resolvedAt: Date
}, { timestamps: true }));
