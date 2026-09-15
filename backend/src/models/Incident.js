// Mongoose Incident Schema Skeleton
const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL_SOS'], default: 'CRITICAL_SOS' },
  status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN' },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);
