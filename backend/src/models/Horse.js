const mongoose = require('mongoose');
const { STOPS } = require('../config/transportCatalog');

const horseSchema = new mongoose.Schema({
  microchipId: {
    type: String,
    required: [true, 'Microchip ID is required'],
    unique: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^[A-Za-z0-9]{10,18}$/.test(v);
      },
      message: props => `${props.value} is not a valid Microchip ID! Must be 10-18 alphanumeric characters.`
    }
  },
  feiPassportNumber: {
    type: String,
    required: [true, 'FEI Passport Number is required'],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Horse name is required'],
    trim: true
  },
  breed: {
    type: String,
    required: [true, 'Breed is required'],
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['STALLION', 'MARE', 'GELDING'],
    required: [true, 'Gender is required']
  },
  weightKg: {
    type: Number,
    required: [true, 'Weight in kg is required'],
    min: [0, 'Weight must be positive']
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner ID is required'],
    index: true
  },
  currentStopId: {
    type: String,
    required: [true, 'Current fixed transport stop is required'],
    enum: STOPS.map((stop) => stop.id),
    index: true
  },
  passportScanUrl: {
    type: String,
    required: [true, 'Passport scan URL is required']
  },
  photos: [{
    type: String
  }],
  medicalHistoryNotes: {
    type: String
  },
  color: { type: String, trim: true },
  identifyingMarks: { type: String, trim: true },
  vaccinationRecordUrl: String,
  lastVaccinationDate: Date,
  reviewStatus: { type: String, enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'], default: 'PENDING_REVIEW', index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,
  reviewHistory: [{
    decision: { type: String, enum: ['APPROVED', 'REJECTED'] },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    notes: String,
    profileVersion: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Horse', horseSchema);
