const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  name: { type: String, required: true, trim: true },
  capacityHorses: { type: Number, required: true, min: 1, max: 12 },
  countryCode: { type: String, required: true, uppercase: true, trim: true },
  registrationExpiresAt: { type: Date, required: true },
  inspectionExpiresAt: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE'], default: 'ACTIVE', index: true },
  notes: { type: String, trim: true, maxlength: 2000 }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
