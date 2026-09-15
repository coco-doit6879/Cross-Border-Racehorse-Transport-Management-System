// Mongoose Horse Schema Skeleton
const mongoose = require('mongoose');

const horseSchema = new mongoose.Schema({
  name: { type: String },
  microchipId: { type: String, unique: true },
  feiPassportNo: { type: String },
  breed: { type: String },
  age: { type: Number },
  weight: { type: Number },
  medicalHistory: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Horse', horseSchema);
