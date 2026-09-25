const mongoose = require('mongoose');

const waypointSchema = new mongoose.Schema({
  sequence: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['PICKUP', 'REST_STOP', 'BORDER_CUSTOMS', 'VET_CHECK', 'DELIVERY'],
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true // [lng, lat]
    }
  },
  estimatedArrival: {
    type: Date,
    required: true
  },
  actualArrival: {
    type: Date
  },
  status: {
    type: String,
    enum: ['PENDING', 'ARRIVED', 'SKIPPED'],
    default: 'PENDING'
  }
}, { _id: true });

const routeDeviationSchema = new mongoose.Schema({
  detectedAt: {
    type: Date,
    default: Date.now
  },
  location: {
    type: [Number] // [lng, lat]
  },
  deviationDistanceKm: {
    type: Number
  },
  type: {
    type: String,
    enum: ['ROUTE_DEVIATION', 'UNSCHEDULED_LONG_STOP'],
    required: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'],
    default: 'OPEN'
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { _id: true });

const currentLocationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number] // [lng, lat]
  },
  speedKmh: {
    type: Number
  },
  headingDegree: {
    type: Number
  },
  updatedAt: {
    type: Date
  }
}, { _id: false });

const assignmentHistorySchema = new mongoose.Schema({
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  changedAt: { type: Date, default: Date.now },
  reason: { type: String, trim: true },
  previousVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  previousDriverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  previousEscortId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  escortId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

const transportRouteSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    unique: true,
    index: true
  },
  vehiclePlateNumber: {
    type: String,
    required: [true, 'Vehicle plate number is required'],
    trim: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    index: true
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Driver ID is required'],
    index: true
  },
  escortId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Escort ID is required'],
    index: true
  },
  waypoints: [waypointSchema],
  currentLocation: {
    type: currentLocationSchema,
    default: null
  },
  routeDeviations: [routeDeviationSchema],
  assignmentNote: { type: String, trim: true },
  assignmentHistory: [assignmentHistorySchema],
  status: {
    type: String,
    enum: ['SCHEDULED', 'IN_TRANSIT', 'INCIDENT_HANDLING', 'DELIVERING', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED',
    index: true
  }
}, { timestamps: true });

// 2dsphere index on currentLocation.coordinates
transportRouteSchema.index({ 'currentLocation.coordinates': '2dsphere' });

module.exports = mongoose.model('TransportRoute', transportRouteSchema);
