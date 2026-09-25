const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  bookingCode: {
    type: String,
    required: [true, 'Booking code is required'],
    unique: true,
    index: true,
    uppercase: true,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer ID is required'],
    index: true
  },
  horseIds: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Horse'
    }],
    validate: {
      validator: (arr) => Array.isArray(arr) && arr.length > 0,
      message: 'Order must contain at least one horse ID'
    },
    required: [true, 'Horse IDs are required']
  },
  origin: {
    address: { type: String, required: [true, 'Origin address is required'] },
    countryCode: { type: String, required: [true, 'Origin country code is required'], uppercase: true },
    coordinates: {
      type: [Number],
      required: [true, 'Origin GeoJSON coordinates [lng, lat] are required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number' && !isNaN(arr[0]) && !isNaN(arr[1]) && !(arr[0] === 0 && arr[1] === 0),
        message: 'Origin GeoJSON coordinates must be a valid array of [lng, lat]'
      }
    }
  },
  destination: {
    address: { type: String, required: [true, 'Destination address is required'] },
    countryCode: { type: String, required: [true, 'Destination country code is required'], uppercase: true },
    coordinates: {
      type: [Number],
      required: [true, 'Destination GeoJSON coordinates [lng, lat] are required'],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number' && !isNaN(arr[0]) && !isNaN(arr[1]) && !(arr[0] === 0 && arr[1] === 0),
        message: 'Destination GeoJSON coordinates must be a valid array of [lng, lat]'
      }
    }
  },
  requestedDepartureDate: {
    type: Date,
    required: [true, 'Requested departure date is required']
  },
  departureId: { type: String, index: true },
  scheduleRevision: Number,
  originStopId: String,
  destinationStopId: String,
  departureLocalDate: String,
  departureLocalTime: String,
  departureTimezone: String,
  specialRequirements: {
    type: String
  },
  estimatedDistanceKm: {
    type: Number
  },
  status: {
    type: String,
    enum: [
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'DOCS_PROCESSING',
      'CLEARED_FOR_TRANSPORT',
      'IN_TRANSIT',
      'DELIVERING',
      'COMPLETED',
      'CANCELLED'
    ],
    default: 'PENDING_APPROVAL',
    index: true
  },
  rejectionReason: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
