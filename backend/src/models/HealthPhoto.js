const mongoose = require('mongoose');

// Binary kept out of HealthLog so timeline queries never load image bytes.
const healthPhotoSchema = new mongoose.Schema({
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mimeType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
  data: { type: Buffer, required: true, select: false },
  size: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('HealthPhoto', healthPhotoSchema);
