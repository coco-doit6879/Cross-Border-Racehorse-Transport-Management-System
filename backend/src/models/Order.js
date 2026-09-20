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
  horseIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Horse',
    required: true
  }],
  origin: {
    address: { type: String, required: [true, 'Origin address is required'] },
    countryCode: { type: String, required: [true, 'Origin country code is required'], uppercase: true },
    coordinates: {
      type: [Number],
      required: [true, 'Origin GeoJSON coordinates [lng, lat] are required']
    }
  },
  destination: {
    address: { type: String, required: [true, 'Destination address is required'] },
    countryCode: { type: String, required: [true, 'Destination country code is required'], uppercase: true },
    coordinates: {
      type: [Number],
      required: [true, 'Destination GeoJSON coordinates [lng, lat] are required']
    }
  },
  requestedDepartureDate: {
    type: Date,
    required: [true, 'Requested departure date is required']
  },
  specialRequirements: {
    type: String
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
