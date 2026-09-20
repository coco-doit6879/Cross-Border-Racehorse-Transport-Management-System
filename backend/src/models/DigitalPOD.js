const mongoose = require('mongoose');

const horseConditionOnArrivalSchema = new mongoose.Schema({
  horseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Horse',
    required: true
  },
  conditionStatus: {
    type: String,
    enum: ['EXCELLENT', 'GOOD', 'MINOR_STRESS', 'INJURED'],
    required: true
  },
  notes: {
    type: String
  }
}, { _id: false });

const digitalPODSchema = new mongoose.Schema({
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransportRoute',
    required: [true, 'Trip ID is required'],
    unique: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order ID is required'],
    index: true
  },
  signerName: {
    type: String,
    required: [true, 'Signer name is required'],
    trim: true
  },
  signerPhone: {
    type: String,
    required: [true, 'Signer phone number is required'],
    trim: true
  },
  signerRole: {
    type: String,
    enum: ['CUSTOMER', 'AUTHORIZED_RECIPIENT', 'STABLE_MANAGER', 'VETERINARIAN'],
    required: [true, 'Signer role is required']
  },
  signatureImageUrl: {
    type: String,
    required: [true, 'Signature image URL is required']
  },
  locationSigned: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Location signed coordinates [lng, lat] are required']
    }
  },
  horseConditionsOnArrival: [horseConditionOnArrivalSchema],
  pdfReportUrl: {
    type: String
  },
  signedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('DigitalPOD', digitalPODSchema);
