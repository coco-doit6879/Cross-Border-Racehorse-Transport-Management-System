const mongoose = require('mongoose');

const horseFileSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  mimeType: { type: String, enum: ['image/jpeg', 'image/png', 'application/pdf'], required: true },
  data: { type: Buffer, required: true, select: false },
  size: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('HorseFile', horseFileSchema);
