// Mongoose HealthLog Schema Skeleton
const mongoose = require('mongoose');

const healthLogSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  horseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Horse' },
  escortId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  temperature: { type: Number },
  waterIntakeLiters: { type: Number },
  stressLevel: { type: String, enum: ['STABLE', 'STRESSED', 'FEVER', 'INJURED'], default: 'STABLE' },
  imageUrl: { type: String },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('HealthLog', healthLogSchema);
