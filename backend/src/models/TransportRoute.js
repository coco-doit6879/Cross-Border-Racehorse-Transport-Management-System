// Mongoose TransportRoute Schema Skeleton
const mongoose = require('mongoose');

const transportRouteSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  vehicleId: { type: String },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  waypoints: [{
    locationName: String,
    type: { type: String, enum: ['PICKUP', 'REST_STOP', 'BORDER_CUSTOMS', 'DELIVERY'] },
    status: { type: String, enum: ['PENDING', 'ARRIVED', 'DEPARTED'], default: 'PENDING' }
  }],
  currentLocation: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  }
}, { timestamps: true });

transportRouteSchema.index({ currentLocation: '2dsphere' });

module.exports = mongoose.model('TransportRoute', transportRouteSchema);
