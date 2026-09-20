const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: [true, 'Event ID (UUID) is required for idempotency'],
    unique: true,
    index: true
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransportRoute',
    required: [true, 'Trip ID is required'],
    index: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Reported By User ID is required']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Incident GeoJSON coordinates [lng, lat] are required']
    }
  },
  description: {
    type: String,
    required: [true, 'Incident description is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'OPEN',
    index: true
  },
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: {
    type: String
  },
  emergencyCostAmount: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

// 2dsphere index on incident location
incidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Incident', incidentSchema);
