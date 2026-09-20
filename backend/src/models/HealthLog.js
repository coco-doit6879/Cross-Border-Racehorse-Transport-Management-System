const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
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
  horseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Horse',
    required: [true, 'Horse ID is required'],
    index: true
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recorded By User ID is required']
  },
  temperatureCelsius: {
    type: Number,
    required: [true, 'Temperature in Celsius is required']
  },
  waterIntakeLiters: {
    type: Number,
    required: [true, 'Water intake in Liters is required'],
    min: 0
  },
  foodIntakeStatus: {
    type: String,
    required: [true, 'Food intake status is required'],
    trim: true
  },
  condition: {
    type: String,
    enum: ['STABLE', 'STRESSED', 'UNSTABLE'],
    required: [true, 'Condition is required']
  },
  alertType: {
    type: String,
    enum: ['NONE', 'FEVER', 'INJURED', 'DEHYDRATION'],
    default: 'NONE'
  },
  photoUrl: {
    type: String
  },
  notes: {
    type: String
  },
  recordedAt: {
    type: Date,
    required: [true, 'Recorded timestamp is required']
  }
}, { timestamps: true });

module.exports = mongoose.model('HealthLog', healthLogSchema);
